from __future__ import annotations

from typing import Any

from sqlalchemy import select

from constants import STATUS_ASSIGNED, TRANSACTION_NEW_ASSET, TRANSACTION_TRANSFER
from db.models import AssetMaster, AssetTransaction, User
from db.serialization import model_to_dict
from db.session import session_scope


class TransactionRepository:
    """Provides persistence operations for asset assignment and transfer history."""

    def list_transactions(self) -> list[dict[str, Any]]:
        """Return all asset movement records with readable asset and user names."""

        with session_scope() as session:
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
                    AssetMaster.asset_name,
                    AssetMaster.serial_number,
                    from_name.label("from_employee_name"),
                    to_name.label("to_assignee_name"),
                    performed_name.label("performed_by_name"),
                )
                .join(AssetMaster, AssetMaster.asset_id == AssetTransaction.asset_id)
                .order_by(AssetTransaction.action_date.desc())
            ).all()

            payload: list[dict[str, Any]] = []
            for tx, asset_name, serial_number, from_employee_name, to_assignee_name, performed_by_name in rows:
                item = model_to_dict(tx)
                item["asset_name"] = asset_name
                item["serial_number"] = serial_number
                item["from_employee_name"] = from_employee_name
                item["to_assignee_name"] = to_assignee_name
                item["performed_by_name"] = performed_by_name
                payload.append(item)
            return payload

    def latest_assignee(self, asset_id: int) -> dict[str, Any] | None:
        """Return the last assignee recorded for an asset."""

        with session_scope() as session:
            row = (
                session.execute(
                    select(AssetTransaction.to_assignee)
                    .where(AssetTransaction.asset_id == asset_id)
                    .order_by(AssetTransaction.action_date.desc(), AssetTransaction.transaction_id.desc())
                    .limit(1)
                )
                .first()
            )
            return {"to_assignee": row[0]} if row else None

    def assign_asset(self, asset: dict[str, Any], to_assignee: int, remarks: str | None, current_user_id: int) -> None:
        """Create an initial assignment transaction and mark the asset assigned."""

        with session_scope() as session:
            tx = AssetTransaction(
                asset_id=asset["asset_id"],
                asset_type=asset["asset_type"],
                from_employee=None,
                to_assignee=to_assignee,
                transaction_type=TRANSACTION_NEW_ASSET,
                remarks=remarks,
                performed_by=current_user_id,
                created_by=current_user_id,
            )
            session.add(tx)

            asset_row = session.get(AssetMaster, asset["asset_id"])
            if asset_row:
                asset_row.asset_status = STATUS_ASSIGNED
                asset_row.modified_by = current_user_id

    def transfer_asset(
        self,
        asset: dict[str, Any],
        from_employee: int,
        to_assignee: int,
        remarks: str | None,
        current_user_id: int,
    ) -> None:
        """Create a transfer transaction from the current assignee to the new assignee."""

        with session_scope() as session:
            tx = AssetTransaction(
                asset_id=asset["asset_id"],
                asset_type=asset["asset_type"],
                from_employee=from_employee,
                to_assignee=to_assignee,
                transaction_type=TRANSACTION_TRANSFER,
                remarks=remarks,
                performed_by=current_user_id,
                created_by=current_user_id,
            )
            session.add(tx)

            asset_row = session.get(AssetMaster, asset["asset_id"])
            if asset_row:
                asset_row.modified_by = current_user_id
