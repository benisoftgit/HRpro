"""Custom DRF permissions for role-based access control."""

from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Allow access only to users with ADMIN role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "ADMIN"
        )


class IsAdminOrHR(BasePermission):
    """Allow access to ADMIN or HR roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("ADMIN", "HR")
        )


class IsAdminOrFinance(BasePermission):
    """Allow access to ADMIN or FINANCE roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("ADMIN", "FINANCE")
        )


class IsAdminHROrFinance(BasePermission):
    """Allow access to ADMIN, HR, or FINANCE roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("ADMIN", "HR", "FINANCE")
        )


class IsManagerOrAbove(BasePermission):
    """Allow access to MANAGER, HR, ADMIN roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("MANAGER", "HR", "ADMIN")
        )


class IsMDOrAbove(BasePermission):
    """Allow access to MD, ADMIN roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("MD", "ADMIN")
        )
