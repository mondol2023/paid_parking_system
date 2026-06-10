from django.urls import path
from . import views

urlpatterns = [
    path('history/', views.PaymentHistoryView.as_view(), name='payment-history'),
    path('<int:booking_id>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('<int:booking_id>/pay/', views.PaymentConfirmView.as_view(), name='payment-confirm'),
]