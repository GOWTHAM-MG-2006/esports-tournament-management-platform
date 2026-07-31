from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/teams/', include('teams.urls')),
    path('api/tournaments/', include('tournaments.urls')),
    path('api/matches/', include('matches.urls')),
    path('api/schema/', SpectacularAPIView.as_view(api_version='v1'), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
