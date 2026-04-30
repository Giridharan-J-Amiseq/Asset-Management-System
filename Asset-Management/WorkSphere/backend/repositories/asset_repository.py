from __future__ import annotations

from typing import Any

from sqlalchemy import String, and_, cast, exists, func, or_, select

from constants import ASSET_CODE_PREFIX, STATUS_RETIRED
from db.models import AssetMaster, AssetTransaction, Maintenance, User
from db.serialization import model_to_dict
from db.session import session_scope


class AssetRepository:
    """Provides persistence operations for asset records."""

    def ensure_asset_code_column(self) -> None:
        """Deprecated: schema changes should be handled via migrations/schema files."""

        return

    def find_assets_missing_codes(self) -> list[dict[str, Any]]:
        """Return assets that need generated asset codes."""

        with session_scope() as session:
            rows = (
                session.execute(
                    select(AssetMaster)
                    .where(
                        or_(
                            AssetMaster.asset_code.is_(None),
                            AssetMaster.asset_code == "",
                            AssetMaster.asset_code.like(f"{ASSET_CODE_PREFIX}-%"),
                        )
                    )
                )
                .scalars()
                .all()
            )
            return [
                {
                    "asset_id": asset.asset_id,
                    "location": asset.location,
                    "asset_type": asset.asset_type,
                    "serial_number": asset.serial_number,
                }
                for asset in rows
            ]

    def update_asset_code(self, asset_id: int, asset_code: str) -> None:
        """Persist a generated asset code for a single asset."""

        with session_scope() as session:
            asset = session.get(AssetMaster, asset_id)
            if asset:
                asset.asset_code = asset_code

    def find_by_id(self, asset_id: int) -> dict[str, Any] | None:
        """Return one asset by primary key."""

        with session_scope() as session:
            asset = session.get(AssetMaster, asset_id)
            return model_to_dict(asset) if asset else None

    def find_by_asset_code(self, asset_code: str) -> dict[str, Any] | None:
        """Return one asset by its business-facing formatted asset id."""

        with session_scope() as session:
            asset = (
                session.execute(select(AssetMaster).where(AssetMaster.asset_code == asset_code).limit(1))
                .scalar_one_or_none()
            )
            return model_to_dict(asset) if asset else None

    def find_by_serial(self, serial_number: str, exclude_asset_id: int | None = None) -> dict[str, Any] | None:
        """Return an asset with the same serial number, optionally excluding one asset."""

        with session_scope() as session:
            stmt = select(AssetMaster.asset_id).where(AssetMaster.serial_number == serial_number)
            if exclude_asset_id is not None:
                stmt = stmt.where(AssetMaster.asset_id != exclude_asset_id)
            row = session.execute(stmt.limit(1)).first()
            return {"asset_id": row[0]} if row else None

    def count_assets(
        self,
        search: str | None = None,
        status_filter: str | None = None,
        type_filter: str | None = None,
        department: str | None = None,
    ) -> int:
        """Count non-retired assets after applying optional filters."""

        with session_scope() as session:
            where_clauses = self._build_asset_filters(search, status_filter, type_filter, department)
            stmt = select(func.count()).select_from(AssetMaster).where(and_(*where_clauses))
            return int(session.execute(stmt).scalar_one())

    def list_assets(
        self,
        page: int,
        page_size: int,
        search: str | None = None,
        status_filter: str | None = None,
        type_filter: str | None = None,
        department: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return paginated non-retired assets after applying optional filters."""

        with session_scope() as session:
            where_clauses = self._build_asset_filters(search, status_filter, type_filter, department)
            offset = (page - 1) * page_size
            rows = (
                session.execute(
                    select(AssetMaster)
                    .where(and_(*where_clauses))
                    .order_by(AssetMaster.modified_on.desc(), AssetMaster.created_on.desc())
                    .limit(page_size)
                    .offset(offset)
                )
                .scalars()
                .all()
            )
            return [model_to_dict(asset) for asset in rows]

    def _build_asset_filters(
        self,
        search: str | None,
        status_filter: str | None,
        type_filter: str | None,
        department: str | None,
    ) -> list[Any]:
        filters: list[Any] = [AssetMaster.is_retired.is_(False)]

        if search:
            search_value = f"%{search}%"
            user_name_exists = exists(
                select(1)
                .select_from(AssetTransaction)
                .join(
                    User,
                    or_(
                        User.user_id == AssetTransaction.from_employee,
                        User.user_id == AssetTransaction.to_assignee,
                    ),
                )
                .where(
                    AssetTransaction.asset_id == AssetMaster.asset_id,
                    User.user_name.ilike(search_value),
                )
                .correlate(AssetMaster)
            )

            filters.append(
                or_(
                    AssetMaster.asset_name.ilike(search_value),
                    AssetMaster.serial_number.ilike(search_value),
                    AssetMaster.brand.ilike(search_value),
                    AssetMaster.asset_code.ilike(search_value),
                    cast(AssetMaster.asset_id, String).ilike(search_value),
                    user_name_exists,
                )
            )
        if status_filter:
            filters.append(AssetMaster.asset_status == status_filter)
        if type_filter:
            filters.append(AssetMaster.asset_type == type_filter)
        if department:
            filters.append(AssetMaster.department == department)
        return filters

    def create_asset(self, payload, asset_code: str, current_user_id: int) -> int:
        """Insert a new asset row and return the generated asset id."""

        with session_scope() as session:
            asset = AssetMaster(
                asset_name=payload.asset_name,
                asset_type=payload.asset_type,
                category=payload.category,
                serial_number=payload.serial_number,
                asset_code=asset_code,
                qr_code_value=None,
                model=payload.model,
                brand=payload.brand,
                specifications=payload.specifications,
                purchase_date=payload.purchase_date,
                purchase_cost=payload.purchase_cost,
                vendor_name=payload.vendor_name,
                invoice_number=payload.invoice_number,
                warranty_start_date=payload.warranty_start_date,
                warranty_expiry=payload.warranty_expiry,
                asset_status=payload.asset_status,
                condition_status=payload.condition_status,
                location=payload.location,
                department=payload.department,
                is_retired=False,
                created_by=current_user_id,
                modified_by=current_user_id,
            )
            session.add(asset)
            session.flush()
            return int(asset.asset_id)

    def update_asset_fields(self, asset_id: int, data: dict[str, Any], modified_by: int) -> None:
        """Update selected asset fields without changing unspecified columns."""

        allowed_fields = {
            "asset_name",
            "asset_type",
            "category",
            "serial_number",
            "model",
            "brand",
            "specifications",
            "purchase_date",
            "purchase_cost",
            "vendor_name",
            "invoice_number",
            "warranty_start_date",
            "warranty_expiry",
            "asset_status",
            "condition_status",
            "location",
            "department",
            "asset_code",
        }
        filtered = {key: value for key, value in data.items() if key in allowed_fields}
        if not filtered:
            return

        with session_scope() as session:
            asset = session.get(AssetMaster, asset_id)
            if not asset:
                return
            for key, value in filtered.items():
                setattr(asset, key, value)
            asset.modified_by = modified_by

    def retire_asset(self, asset_id: int, modified_by: int) -> None:
        """Soft-retire an asset and move it to the Retired status."""

        with session_scope() as session:
            asset = session.get(AssetMaster, asset_id)
            if asset:
                asset.is_retired = True
                asset.asset_status = STATUS_RETIRED
                asset.modified_by = modified_by

    def update_qr(self, asset_id: int, qr_value: int, image_url: str) -> None:
        """Store QR metadata after a QR image has been generated."""

        with session_scope() as session:
            asset = session.get(AssetMaster, asset_id)
            if asset:
                asset.qr_code_value = qr_value
                asset.qr_code_image_url = image_url

    def list_transactions_for_asset(self, asset_id: int) -> list[dict[str, Any]]:
        """Return the movement history for one asset."""

        with session_scope() as session:
            # Use correlated scalar subqueries to keep the payload shape stable.
            from_name = (
                select(User.user_name)
                .where(User.user_id == AssetTransaction.from_employee)
                .correlate(AssetTransaction)
                .scalar_subquery()
            )
            to_name = (
                select(User.user_name)
                .where(User.user_id == AssetTransaction.to_assignee)
                .correlate(AssetTransaction)
                .scalar_subquery()
            )
            performed_name = (
                select(User.user_name)
                .where(User.user_id == AssetTransaction.performed_by)
                .correlate(AssetTransaction)
                .scalar_subquery()
            )

            rows = session.execute(
                select(
                    AssetTransaction,
                    from_name.label("from_employee_name"),
                    to_name.label("to_assignee_name"),
                    performed_name.label("performed_by_name"),
                )
                .where(AssetTransaction.asset_id == asset_id)
                .order_by(AssetTransaction.action_date.desc())
            ).all()

            payload: list[dict[str, Any]] = []
            for tx, from_employee_name, to_assignee_name, performed_by_name in rows:
                item = model_to_dict(tx)
                item["from_employee_name"] = from_employee_name
                item["to_assignee_name"] = to_assignee_name
                item["performed_by_name"] = performed_by_name
                payload.append(item)
            return payload

    def list_maintenance_for_asset(self, asset_id: int) -> list[dict[str, Any]]:
        """Return maintenance records linked to one asset."""

        with session_scope() as session:
            rows = (
                session.execute(
                    select(Maintenance)
                    .where(Maintenance.asset_id == asset_id)
                    .order_by(Maintenance.created_on.desc())
                )
                .scalars()
                .all()
            )
            return [model_to_dict(row) for row in rows]
