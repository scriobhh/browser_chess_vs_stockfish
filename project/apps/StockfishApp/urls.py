from django.urls import path
from project.apps.StockfishApp import views

app_name = 'StockfishApp'
urlpatterns = [
    path('', views.index, name='index'),
    path('get_move/', views.stockfish_next_move, name='stockfish_next_move'),
]
