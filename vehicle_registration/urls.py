# vehicle_registration/urls.py

from django.urls import path
from . import views

"""
urlpatterns = [
    path('', views.Home, name='home'),  # Example view
    path('profile/', views.Profile, name = 'profile'),
]
"""
urlpatterns = [
    path('', views.VehicleRegistrationListCreateView.as_view(), name='vehicle-list-create'),
    path('search/', views.VehicleSearchView.as_view(), name='vehicle-search'),   
    path('<int:pk>/', views.VehicleRegistrationDetailView.as_view(), name='vehicle-detail'),
]
