from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Account


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        try:
            return user.account.role == Account.Role.ADMIN
        except Exception:
            return False


class IsVendor(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        try:
            return user.account.role == Account.Role.VENDOR
        except Exception:
            return False


class IsRider(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        try:
            return user.account.role == Account.Role.RIDER
        except Exception:
            return False


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


class IsVendorOrRiderOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        try:
            role = user.account.role
            return role in (Account.Role.VENDOR, Account.Role.RIDER, Account.Role.ADMIN)
        except Exception:
            return False
