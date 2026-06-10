from django.urls import path
from . import views

urlpatterns = [
    path('', views.ParkingLotListCreateView.as_view(), name='lot-list-create'),
    path('nearest/', views.NearestLotsView.as_view(), name='lot-nearest'),     # before <pk>
    path('<int:pk>/', views.ParkingLotDetailView.as_view(), name='lot-detail'),
    path('<int:pk>/slots/', views.LotSlotsView.as_view(), name='lot-slots'),
]