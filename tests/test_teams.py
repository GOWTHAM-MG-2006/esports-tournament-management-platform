import pytest
from rest_framework.test import APIClient

from teams.models import Team, TeamMember
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

    def test_remove_member(self):
        team = Team.objects.create(name='Fnatic', tag='FNC', owner=self.user)
        new_user = User.objects.create_user(
            email='m3@m.com', username='member3', password='pass1234'
        )
        self.client.post(f'{self.url}{team.id}/add-member/', {'user_id': new_user.id})
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
