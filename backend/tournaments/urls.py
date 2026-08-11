from django.urls import include, path
from rest_framework.routers import DefaultRouter
from tournaments.views import TournamentViewSet

app_name = 'tournaments'

router = DefaultRouter()
router.register('', TournamentViewSet, basename='tournament')

urlpatterns = [
    path('', include(router.urls)),
]
