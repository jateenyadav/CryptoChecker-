from django.urls import path

from . import views

urlpatterns = [
    # Market data
    path("markets", views.markets),
    path("coins/<str:coin_id>", views.coin_detail),
    path("coins/<str:coin_id>/chart", views.coin_chart),
    path("global", views.global_stats),
    path("trending", views.trending),
    path("search", views.search),
    path("simple-price", views.simple_price),
    # Watchlist
    path("watchlist", views.WatchlistView.as_view()),
    path("watchlist/<str:coin_id>", views.watchlist_remove),
    # Portfolio
    path("portfolio", views.PortfolioView.as_view()),
    path("portfolio/<str:coin_id>", views.portfolio_remove),
    # Alerts
    path("alerts", views.AlertsView.as_view()),
    path("alerts/<int:alert_id>", views.alert_remove),
]
