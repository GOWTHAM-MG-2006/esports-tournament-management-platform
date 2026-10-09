from django.urls import path

from predictions.views import PredictMatchView

urlpatterns = [
    path('match/<int:match_id>/', PredictMatchView.as_view(), name='predict-match'),
]
