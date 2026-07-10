from django.contrib import admin

from .models import Alert, Coin, Holding, PriceSnapshot, Watchlist

admin.site.register([Coin, PriceSnapshot, Watchlist, Holding, Alert])
