"""Role-based permissions (Phase 1)."""
from rest_framework.permissions import BasePermission


class IsOrganizer(BasePermission):
    """Allow users with the organizer or admin role."""

    message = 'Organizer role required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) in ('organizer', 'admin')
        )
