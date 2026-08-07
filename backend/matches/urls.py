from django.urls import include, path
from rest_framework.routers import DefaultRouter

from matches.views import MatchViewSet

router = DefaultRouter()
router.register('', MatchViewSet, basename='match')

urlpatterns = [
    path('', include(router.urls)),
]
