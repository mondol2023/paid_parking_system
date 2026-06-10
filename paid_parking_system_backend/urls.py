"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def home(request):
    return HttpResponse("Welcome to the Parking API backend!")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home, name="home"),
    path('api/vehicle-registration', include("vehicle_registration.urls")),
]
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({'status': 'ok', 'message': 'Parking API is running.'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', HealthCheckView.as_view(), name='health-check'),

   
    path('api/auth/', include('accounts.urls')),

 
    path('api/vehicles/', include('vehicle_registration.urls')),
    path('api/parking-lots/', include('parking_lot.urls')),
    path('api/bookings/', include('booking.urls')),
    path('api/payments/', include('payment.urls')),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)