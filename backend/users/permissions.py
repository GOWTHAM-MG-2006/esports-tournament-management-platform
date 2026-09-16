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


class IsAdmin(BasePermission):
    """Allow only users with the admin role."""

    message = 'Admin role required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'admin'
        )


class IsTeamOwner(BasePermission):
    """Object-level permission: only the team's owner may manage it."""

    message = 'Only the team owner can perform this action.'

    def has_object_permission(self, request, view, obj):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(obj, 'owner_id', None) == request.user.id
        )
