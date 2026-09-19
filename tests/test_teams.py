import pytest
from rest_framework.test import APIClient

from teams.models import Team, TeamJoinRequest, TeamMember
from users.models import User


@pytest.mark.django_db
class TestTeamViewSet:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='t@t.com', username='teamuser', password='pass1234'
        )
        self.client.force_authenticate(user=self.user)
        self.url = '/api/teams/'

    def test_create_team(self):
        response = self.client.post(self.url, {'name': 'Fnatic', 'tag': 'FNC'})
        assert response.status_code == 201
        assert Team.objects.count() == 1
        assert TeamMember.objects.filter(
            team__name='Fnatic', user=self.user, role='captain'
        ).exists()

    def test_list_teams(self):
        Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert len(response.data['data']['results']) == 1

    def test_add_member(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        new_user = User.objects.create_user(
            email='m@m.com', username='member', password='pass1234'
        )
        response = self.client.post(
            f'{self.url}{team.id}/add-member/', {'user_id': new_user.id}
        )
        assert response.status_code == 201
        # Invite flow: a pending request is created, no instant membership.
        assert TeamJoinRequest.objects.filter(
            team=team, user=new_user, status='pending'
        ).exists()
        assert not TeamMember.objects.filter(team=team, user=new_user).exists()

    def test_unauthenticated_create(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.url, {'name': 'Fnatic', 'tag': 'FNC'})
        assert response.status_code == 401

    def test_add_member_duplicate(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        new_user = User.objects.create_user(
            email='m2@m.com', username='member2', password='pass1234'
        )
        self.client.post(f'{self.url}{team.id}/add-member/', {'user_id': new_user.id})
        response = self.client.post(
            f'{self.url}{team.id}/add-member/', {'user_id': new_user.id}
        )
        assert response.status_code == 400

    def test_add_member_user_not_found(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        response = self.client.post(
            f'{self.url}{team.id}/add-member/', {'user_id': 9999}
        )
        assert response.status_code == 404

    def test_add_member_by_email(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        new_user = User.objects.create_user(
            email='byemail@m.com', username='byemail', password='pass1234'
        )
        response = self.client.post(
            f'{self.url}{team.id}/add-member/', {'email': 'byemail@m.com'}
        )
        assert response.status_code == 201
        assert TeamJoinRequest.objects.filter(
            team=team, user=new_user, status='pending'
        ).exists()
        assert not TeamMember.objects.filter(team=team, user=new_user).exists()

    def test_add_member_by_email_not_found(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        response = self.client.post(
            f'{self.url}{team.id}/add-member/', {'email': 'nobody@m.com'}
        )
        assert response.status_code == 404

    def test_add_member_missing_identifier(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        response = self.client.post(
            f'{self.url}{team.id}/add-member/', {'role': 'member'}
        )
        assert response.status_code == 400

    def test_add_member_captain_role_rejected(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        new_user = User.objects.create_user(
            email='nocap@m.com', username='nocap', password='pass1234'
        )
        response = self.client.post(
            f'{self.url}{team.id}/add-member/',
            {'user_id': new_user.id, 'role': 'captain'},
        )
        assert response.status_code == 400
        assert not TeamJoinRequest.objects.filter(
            team=team, user=new_user
        ).exists()

    def test_remove_member(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        new_user = User.objects.create_user(
            email='m3@m.com', username='member3', password='pass1234'
        )
        TeamMember.objects.create(team=team, user=new_user, role='member')
        response = self.client.post(
            f'{self.url}{team.id}/remove-member/', {'user_id': new_user.id}
        )
        assert response.status_code == 200
        assert not TeamMember.objects.filter(team=team, user=new_user).exists()

    def test_remove_owner_forbidden(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        TeamMember.objects.create(team=team, user=self.user, role='captain')
        response = self.client.post(
            f'{self.url}{team.id}/remove-member/', {'user_id': self.user.id}
        )
        assert response.status_code == 400

    # --- Member visibility (issue: members saw an empty Teams page) ---

    def test_member_sees_team_in_list(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        member = User.objects.create_user(
            email='mem@m.com', username='mem', password='pass1234'
        )
        TeamMember.objects.create(team=team, user=member, role='member')
        self.client.force_authenticate(user=member)
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert len(response.data['data']['results']) == 1
        assert response.data['data']['results'][0]['name'] == 'Fnatic'

    def test_non_owner_cannot_delete_team(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        member = User.objects.create_user(
            email='mem2@m.com', username='mem2', password='pass1234'
        )
        TeamMember.objects.create(team=team, user=member, role='member')
        self.client.force_authenticate(user=member)
        response = self.client.delete(f'{self.url}{team.id}/')
        assert response.status_code == 403
        assert Team.objects.filter(id=team.id).exists()

    def test_non_owner_cannot_add_member(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        member = User.objects.create_user(
            email='mem3@m.com', username='mem3', password='pass1234'
        )
        TeamMember.objects.create(team=team, user=member, role='member')
        outsider = User.objects.create_user(
            email='out@m.com', username='outsider', password='pass1234'
        )
        self.client.force_authenticate(user=member)
        response = self.client.post(
            f'{self.url}{team.id}/add-member/', {'user_id': outsider.id}
        )
        assert response.status_code == 403

    # --- Join-request flow ---

    def _invite(self, team, user):
        response = self.client.post(
            f'{self.url}{team.id}/add-member/', {'user_id': user.id}
        )
        assert response.status_code == 201
        return TeamJoinRequest.objects.get(team=team, user=user, status='pending')

    def test_accept_invite_creates_membership(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        invited = User.objects.create_user(
            email='inv@m.com', username='invited', password='pass1234'
        )
        invite = self._invite(team, invited)
        self.client.force_authenticate(user=invited)
        response = self.client.post(f'{self.url}requests/{invite.id}/accept/')
        assert response.status_code == 200
        assert TeamMember.objects.filter(team=team, user=invited).exists()
        invite.refresh_from_db()
        assert invite.status == 'accepted'

    def test_accept_invite_forces_member_role(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        invited = User.objects.create_user(
            email='force@m.com', username='forced', password='pass1234'
        )
        invite = TeamJoinRequest.objects.create(
            team=team,
            user=invited,
            requested_by=self.user,
            role='captain',
            status='pending',
        )
        self.client.force_authenticate(user=invited)
        response = self.client.post(f'{self.url}requests/{invite.id}/accept/')
        assert response.status_code == 200
        member = TeamMember.objects.get(team=team, user=invited)
        assert member.role == 'member'

    def test_decline_invite_creates_no_membership(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        invited = User.objects.create_user(
            email='dec@m.com', username='decliner', password='pass1234'
        )
        invite = self._invite(team, invited)
        self.client.force_authenticate(user=invited)
        response = self.client.post(f'{self.url}requests/{invite.id}/decline/')
        assert response.status_code == 200
        assert not TeamMember.objects.filter(team=team, user=invited).exists()
        invite.refresh_from_db()
        assert invite.status == 'declined'

    def test_accept_other_users_invite_404(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        invited = User.objects.create_user(
            email='inv2@m.com', username='invited2', password='pass1234'
        )
        stranger = User.objects.create_user(
            email='str@m.com', username='stranger', password='pass1234'
        )
        invite = self._invite(team, invited)
        self.client.force_authenticate(user=stranger)
        response = self.client.post(f'{self.url}requests/{invite.id}/accept/')
        assert response.status_code == 404
        assert not TeamMember.objects.filter(team=team, user=stranger).exists()

    def test_my_requests_lists_pending_invites(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        invited = User.objects.create_user(
            email='inv3@m.com', username='invited3', password='pass1234'
        )
        self._invite(team, invited)
        self.client.force_authenticate(user=invited)
        response = self.client.get(f'{self.url}requests/')
        assert response.status_code == 200
        assert len(response.data['data']) == 1
        assert response.data['data'][0]['team_name'] == 'Fnatic'

    def test_owner_can_cancel_invite(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        invited = User.objects.create_user(
            email='inv4@m.com', username='invited4', password='pass1234'
        )
        invite = self._invite(team, invited)
        response = self.client.delete(f'{self.url}requests/{invite.id}/')
        assert response.status_code == 200
        assert not TeamJoinRequest.objects.filter(id=invite.id).exists()

    def test_non_owner_cannot_cancel_invite(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        invited = User.objects.create_user(
            email='inv5@m.com', username='invited5', password='pass1234'
        )
        invite = self._invite(team, invited)
        self.client.force_authenticate(user=invited)
        response = self.client.delete(f'{self.url}requests/{invite.id}/')
        assert response.status_code == 403
        assert TeamJoinRequest.objects.filter(id=invite.id).exists()

    # --- Member leave flow ---

    def test_member_can_leave_team(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        member = User.objects.create_user(
            email='leaver@m.com', username='leaver', password='pass1234'
        )
        TeamMember.objects.create(team=team, user=member, role='member')
        self.client.force_authenticate(user=member)
        response = self.client.post(f'{self.url}{team.id}/leave/')
        assert response.status_code == 200
        assert not TeamMember.objects.filter(team=team, user=member).exists()
        assert Team.objects.filter(id=team.id).exists()

    def test_leave_when_not_member_404(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        outsider = User.objects.create_user(
            email='out2@m.com', username='outsider2', password='pass1234'
        )
        self.client.force_authenticate(user=outsider)
        response = self.client.post(f'{self.url}{team.id}/leave/')
        assert response.status_code == 404

    def test_owner_cannot_leave_team(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        response = self.client.post(f'{self.url}{team.id}/leave/')
        assert response.status_code == 400
        assert Team.objects.filter(id=team.id).exists()
