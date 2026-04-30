from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import inspect


def model_to_dict(instance: Any) -> dict[str, Any]:
    """Convert an ORM model instance into a JSON-serializable dictionary."""

    mapper = inspect(instance).mapper
    payload: dict[str, Any] = {}
    for attr in mapper.column_attrs:
        value = getattr(instance, attr.key)
        if isinstance(value, (datetime, date)):
            payload[attr.key] = value
        elif isinstance(value, Decimal):
            payload[attr.key] = float(value)
        else:
            payload[attr.key] = value
    return payload
