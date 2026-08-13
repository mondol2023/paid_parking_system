from django.contrib.admin.apps import AdminConfig


class ParkingAdminConfig(AdminConfig):
    """Installed in place of 'django.contrib.admin' so admin.site is our site.

    The site class itself lives in admin.py, which imports models; naming it
    lazily here keeps that import out of the app-loading phase.
    """
    default_site = 'paid_parking_system_backend.admin.ParkingAdminSite'
