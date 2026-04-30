import hashlib
import secrets
from typing import Any

from fastapi import HTTPException

from auth import hash_password
from constants import VIEWER_ROLE
from repositories.user_repository import UserRepository
from schemas import UserCreate, UserUpdate


class UserService:
    """Coordinates user account business rules."""

    def __init__(self, repository: UserRepository | None = None):
        """Wire the service to the user repository."""

        self.repository = repository or UserRepository()

    def list_assignable_users(self) -> list[dict[str, Any]]:
        """Return active users who can receive assets."""

        return self.repository.list_assignable()

    def list_users(self) -> list[dict[str, Any]]:
        """Return all users for the admin directory."""

        return self.repository.list_users()

    def create_user(self, payload: UserCreate) -> dict[str, Any]:
        """Create a user after enforcing unique username and email."""

        if self.repository.find_existing_identity(payload.username, payload.email):
            raise HTTPException(status_code=400, detail="Username or email already exists")
        user_id = self.repository.create_user(payload, hash_password(payload.password))
        return {"message": "User created successfully", "user_id": user_id}

    def ensure_microsoft_user(self, *, email: str, display_name: str | None) -> dict[str, Any]:
        """Create (or return) a local user record for a Microsoft account."""

        email_value = (email or "").strip().lower()
        if not email_value:
            raise HTTPException(status_code=400, detail="Microsoft account did not provide an email address")

        existing = self.repository.find_by_email(email_value)
        if existing:
            if not existing.get("is_active"):
                raise HTTPException(status_code=403, detail="User account is inactive")
            return existing

        username_base = email_value
        if len(username_base) > 50:
            digest = hashlib.sha1(username_base.encode("utf-8")).hexdigest()[:10]
            username_base = f"{username_base[:39]}-{digest}"

        # If username collides, add a deterministic suffix from the email.
        username = username_base
        if self.repository.find_existing_identity(username, email_value):
            digest = hashlib.sha1(email_value.encode("utf-8")).hexdigest()[:6]
            username = f"{username_base[:43]}-{digest}"

        user_name = (display_name or username).strip()[:100]
        password = secrets.token_urlsafe(32)
        password_hash = hash_password(password)
        user_id = self.repository.create_user_identity(
            user_name=user_name,
            username=username,
            email=email_value,
            password_hash=password_hash,
            role=VIEWER_ROLE,
            is_active=True,
        )
        created = self.repository.find_by_id(user_id)
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create user")
        return created

    def update_user(self, user_id: int, payload: UserUpdate) -> dict[str, str]:
        """Update a user after verifying the account exists."""

        if not self.repository.find_by_id(user_id):
            raise HTTPException(status_code=404, detail="User not found")
        data = payload.model_dump(exclude_unset=True)
        if not data:
            return {"message": "No changes supplied"}
        if "password" in data:
            data["password_hash"] = hash_password(data.pop("password"))
        self.repository.update_user_fields(user_id, data)
        return {"message": "User updated successfully"}

    def deactivate_user(self, user_id: int) -> dict[str, str]:
        """Deactivate a user after verifying the account exists."""

        if not self.repository.find_by_id(user_id):
            raise HTTPException(status_code=404, detail="User not found")
        self.repository.deactivate_user(user_id)
        return {"message": "User deactivated successfully"}
