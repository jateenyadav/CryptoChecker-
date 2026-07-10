from django.urls import path

from . import views

urlpatterns = [
    path("insights/market", views.market_insight),
    path("insights/coin/<str:coin_id>", views.coin_insight),
    path("insights/portfolio", views.portfolio_insight),
]
