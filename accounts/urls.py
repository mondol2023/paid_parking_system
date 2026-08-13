from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('login/', views.ThrottledTokenObtainPairView.as_view(), name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),

    # Custom
    path('register/', views.RegisterView.as_view(), name='auth-register'),
    path('profile/', views.ProfileView.as_view(), name='auth-profile'),
]