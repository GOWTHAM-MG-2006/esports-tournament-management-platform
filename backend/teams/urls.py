from django.urls import include, path
from rest_framework.routers import DefaultRouter

from teams.views import TeamViewSet

app_name = 'teams'

router = DefaultRouter()
router.register('', TeamViewSet, basename='team')

urlpatterns = [
    path('', include(router.urls)),
]
