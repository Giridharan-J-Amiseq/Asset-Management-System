from datetime import datetime
from pathlib import Path
import random
import string
from typing import Any

from fastapi import HTTPException

from constants import (
    ASSET_CATEGORIES,
    ASSET_CODE_PREFIX,
    ASSET_DEPARTMENTS,
    ASSET_LOCATIONS,
    ASSET_STATUSES,
    ASSET_TYPES,
    CONDITION_STATUSES,
)
from repositories.asset_repository import AssetRepository
from schemas import AssetCreate, AssetUpdate
from utils.qr_code import QRCodeGenerator


class AssetService:
    """Coordinates asset business rules, asset codes, and QR generation."""

    def __init__(self, repository: AssetRepository | None = None, qr_generator: QRCodeGenerator | None = None):
        """Wire the service to its repository and QR helper."""

        self.repository = repository or AssetRepository()
        qr_dir = Path(__file__).resolve().parent.parent / "static" / "qrcodes"
        self.qr_generator = qr_generator or QRCodeGenerator(qr_dir)
        self._asset_code_backfill_ready = False

    def dropdown_options(self) -> dict[str, list[str]]:
        """Return controlled values used by asset forms."""

        return {
            "locations": list(ASSET_LOCATIONS.keys()),
            "departments": list(ASSET_DEPARTMENTS.keys()),
            "asset_types": list(ASSET_TYPES),
            "asset_statuses": list(ASSET_STATUSES),
            "conditions": list(CONDITION_STATUSES),
            "categories": list(ASSET_CATEGORIES),
        }

    def build_asset_code(self, location: str | None, asset_type: str, serial_number: str, asset_id: int | None = None) -> str:
        """Create the human-readable asset code used on cards and QR pages."""

        location_code = (location or "UNK")[:3].upper()
        asset_type_code = (asset_type or "UNK")[:3].upper()
        serial_suffix = (serial_number or "00000")[-5:].upper()
        suffix_source = random.Random(asset_id if asset_id is not None else 0)
        random_suffix = "".join(suffix_source.choices(string.ascii_uppercase + string.digits, k=2))
        return f"{ASSET_CODE_PREFIX}-{location_code}-{asset_type_code}-{serial_suffix}-{random_suffix}"

    def decorate_asset(self, asset: dict[str, Any]) -> dict[str, Any]:
        """Normalize asset output with internal and business-facing asset identifiers."""

        asset_copy = dict(asset)
        if not asset_copy.get("asset_code"):
            asset_copy["asset_code"] = self.build_asset_code(
                asset_copy.get("location"),
                asset_copy.get("asset_type"),
                asset_copy.get("serial_number"),
                asset_copy.get("asset_id"),
            )
        asset_copy["formatted_asset_id"] = asset_copy["asset_code"]
        asset_copy["asset_count"] = asset_copy.get("asset_id")
        try:
            asset_copy["qr_code_value"] = int(asset_copy["qr_code_value"]) if asset_copy.get("qr_code_value") is not None else None
        except (TypeError, ValueError):
            asset_copy["qr_code_value"] = asset_copy.get("asset_id")
        return asset_copy

    def build_qr_payload(self, asset: dict[str, Any], transactions: list[dict[str, Any]] | None = None) -> str:
        """Build the readable text that a scanner displays after reading the QR code."""

        latest_transaction = transactions[0] if transactions else None
        assigned_to = latest_transaction.get("to_assignee_name") if latest_transaction else None
        assigned_on = latest_transaction.get("action_date") if latest_transaction else None
        generated_on = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return "\n".join(
            [
                "WorkSphere Asset",
                f"Asset ID: {asset.get('formatted_asset_id') or asset.get('asset_code') or '-'}",
                f"Asset Name: {asset.get('asset_name') or '-'}",
                f"Asset Count: {asset.get('asset_count') or asset.get('asset_id') or '-'}",
                f"Serial Number: {asset.get('serial_number') or '-'}",
                f"Assigned To: {assigned_to or 'Not assigned'}",
                f"Assigned Date: {assigned_on or '-'}",
                f"Generated On: {generated_on}",
            ]
        )

    def ensure_asset_code_values(self) -> None:
        """Backfill asset codes for old rows once per process."""

        if self._asset_code_backfill_ready:
            return

        for row in self.repository.find_assets_missing_codes():
            asset_code = self.build_asset_code(row["location"], row["asset_type"], row["serial_number"], row["asset_id"])
            self.repository.update_asset_code(row["asset_id"], asset_code)
        self._asset_code_backfill_ready = True

    def resolve_asset_or_404(self, asset_identifier: int | str) -> dict[str, Any]:
        """Return one asset by numeric database id or formatted asset id."""

        self.ensure_asset_code_values()
        asset = None
        identifier_text = str(asset_identifier).strip()
        if identifier_text.isdigit():
            asset = self.repository.find_by_id(int(identifier_text))
        if not asset:
            asset = self.repository.find_by_asset_code(identifier_text)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        return self.decorate_asset(asset)

    def get_asset_or_404(self, asset_id: int | str) -> dict[str, Any]:
        """Return one asset or raise a 404 response."""

        return self.resolve_asset_or_404(asset_id)

    def list_assets(
        self,
        page: int,
        page_size: int,
        search: str | None = None,
        status_filter: str | None = None,
        type_filter: str | None = None,
        department: str | None = None,
    ) -> dict[str, Any]:
        """Return paginated assets after applying optional filters."""

        self.ensure_asset_code_values()

        total = self.repository.count_assets(
            search=search,
            status_filter=status_filter,
            type_filter=type_filter,
            department=department,
        )
        items = self.repository.list_assets(
            page=page,
            page_size=page_size,
            search=search,
            status_filter=status_filter,
            type_filter=type_filter,
            department=department,
        )
        return {"page": page, "page_size": page_size, "total": total, "items": [self.decorate_asset(item) for item in items]}

    def get_asset_detail(self, asset_id: int | str) -> dict[str, Any]:
        """Return asset master data with related transactions and maintenance records."""

        asset = self.get_asset_or_404(asset_id)
        internal_asset_id = asset["asset_id"]
        return {
            "asset": asset,
            "transactions": self.repository.list_transactions_for_asset(internal_asset_id),
            "maintenance": self.repository.list_maintenance_for_asset(internal_asset_id),
        }

    def create_asset(self, payload: AssetCreate, current_user: dict[str, Any]) -> dict[str, Any]:
        """Create an asset, assign its final asset code, and generate its QR image."""

        self.ensure_asset_code_values()
        if self.repository.find_by_serial(payload.serial_number):
            raise HTTPException(status_code=400, detail="Serial number already exists")

        temporary_code = self.build_asset_code(payload.location, payload.asset_type, payload.serial_number, None)
        asset_id = self.repository.create_asset(payload, temporary_code, current_user["user_id"])
        asset_code = self.build_asset_code(payload.location, payload.asset_type, payload.serial_number, asset_id)
        self.repository.update_asset_code(asset_id, asset_code)
        qr_value = asset_id
        qr_payload = self.build_qr_payload(
            {
                "asset_id": asset_id,
                "asset_name": payload.asset_name,
                "asset_code": asset_code,
                "formatted_asset_id": asset_code,
                "asset_count": asset_id,
                "serial_number": payload.serial_number,
            }
        )
        image_url = self.qr_generator.generate_for_asset(asset_id, qr_payload)
        self.repository.update_qr(asset_id, qr_value, image_url)
        return {
            "message": "Asset created successfully",
            "asset_id": asset_id,
            "asset_code": asset_code,
            "formatted_asset_id": asset_code,
            "asset_count": asset_id,
            "qr_code_value": qr_value,
            "qr_code_image_url": image_url,
            "qr_payload": qr_payload,
        }

    def update_asset(self, asset_id: int | str, payload: AssetUpdate, current_user: dict[str, Any]) -> dict[str, Any]:
        """Apply partial asset updates after checking asset existence and serial uniqueness."""

        asset = self.get_asset_or_404(asset_id)
        internal_asset_id = asset["asset_id"]
        data = payload.model_dump(exclude_unset=True)
        if not data:
            return {"message": "No changes supplied", "asset_id": internal_asset_id}
        if data.get("serial_number") and self.repository.find_by_serial(data["serial_number"], exclude_asset_id=internal_asset_id):
            raise HTTPException(status_code=400, detail="Serial number already exists")
        self.repository.update_asset_fields(internal_asset_id, data, current_user["user_id"])
        return {"message": "Asset updated successfully", "asset_before": asset}

    def retire_asset(self, asset_id: int | str, current_user: dict[str, Any]) -> dict[str, str]:
        """Retire an asset after confirming it exists."""

        asset = self.get_asset_or_404(asset_id)
        self.repository.retire_asset(asset["asset_id"], current_user["user_id"])
        return {"message": "Asset retired successfully"}

    def generate_qr(self, asset_id: int | str) -> dict[str, Any]:
        """Generate or refresh the QR code image for an asset."""

        asset = self.get_asset_or_404(asset_id)
        internal_asset_id = asset["asset_id"]
        transactions = self.repository.list_transactions_for_asset(internal_asset_id)
        qr_value = asset.get("qr_code_value") or internal_asset_id
        qr_payload = self.build_qr_payload(asset, transactions)
        image_url = self.qr_generator.generate_for_asset(internal_asset_id, qr_payload)
        self.repository.update_qr(internal_asset_id, int(qr_value), image_url)
        return {
            "message": "QR code generated successfully",
            "qr_code_value": int(qr_value),
            "formatted_asset_id": asset.get("formatted_asset_id") or asset.get("asset_code"),
            "asset_count": asset.get("asset_count") or internal_asset_id,
            "qr_code_image_url": image_url,
            "qr_payload": qr_payload,
        }
