"""Regression tests for vehicle ownership scoping and registration validation."""
from django.contrib.auth.models import User
from django.test import override_settings
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from booking.models import Booking
from parking_lot.models import ParkingLot, Slot

from .models import VehicleRegistration

# Throttling is a production concern; leaving it on makes the suite order
# dependent because DRF's rate counters live in the process-wide cache.
NO_THROTTLE = override_settings(REST_FRAMEWORK={
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
})

VEHICLE_PAYLOAD = {
    'vehicle_model': 'Corolla',
    'vehicle_license': 'dha-1234',
    'vehicle_type': VehicleRegistration.CAR,
    'vehicle_length': 4.5,
    'vehicle_width': 1.8,
    'vehicle_height': 1.5,
    'driver_name': 'Alice',
    'driver_phone': '+8801700000000',
    'driver_license': 'DL-1',
}


def make_vehicle(owner, license_plate='OWN-1', **overrides):
    data = dict(VEHICLE_PAYLOAD, vehicle_license=license_plate, **overrides)
    return VehicleRegistration.objects.create(owner=owner, **data)


@NO_THROTTLE
class VehicleOwnershipTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.bob = User.objects.create_user('bob', 'bob@example.com', 'pw-bob-123')
        self.alice_vehicle = make_vehicle(self.alice, 'ALICE-1')
        self.bob_vehicle = make_vehicle(self.bob, 'BOB-1')

    def test_list_only_returns_own_vehicles(self):
        self.client.force_authenticate(self.alice)
        response = self.client.get(reverse('vehicle-list-create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['vehicle_license'], 'ALICE-1')

    def test_detail_of_another_users_vehicle_is_404(self):
        self.client.force_authenticate(self.alice)
        url = reverse('vehicle-detail', args=[self.bob_vehicle.pk])
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.put(url, {'vehicle_model': 'hacked'}, format='json').status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.bob_vehicle.refresh_from_db()
        self.assertEqual(self.bob_vehicle.vehicle_model, 'Corolla')
        self.assertTrue(self.bob_vehicle.is_active)

    def test_search_is_scoped_to_owner(self):
        self.client.force_authenticate(self.alice)
        response = self.client.get(reverse('vehicle-search'), {'license': 'BOB'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_staff_can_see_every_vehicle(self):
        staff = User.objects.create_user('root', 'root@example.com', 'pw-root-123', is_staff=True)
        self.client.force_authenticate(staff)
        response = self.client.get(reverse('vehicle-list-create'))
        self.assertEqual(response.data['count'], 2)


@NO_THROTTLE
class VehicleCreateTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.bob = User.objects.create_user('bob', 'bob@example.com', 'pw-bob-123')
        self.client.force_authenticate(self.alice)

    def test_owner_is_taken_from_the_request_not_the_body(self):
        response = self.client.post(
            reverse('vehicle-list-create'),
            dict(VEHICLE_PAYLOAD, owner=self.bob.pk),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VehicleRegistration.objects.get().owner, self.alice)

    def test_license_plate_is_normalised_and_unique_case_insensitively(self):
        url = reverse('vehicle-list-create')
        first = self.client.post(url, VEHICLE_PAYLOAD, format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data['vehicle_license'], 'DHA-1234')

        duplicate = self.client.post(
            url, dict(VEHICLE_PAYLOAD, vehicle_license='DHA-1234'), format='json'
        )
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vehicle_license', duplicate.data)

    def test_non_positive_dimensions_are_rejected(self):
        response = self.client.post(
            reverse('vehicle-list-create'),
            dict(VEHICLE_PAYLOAD, vehicle_length=0),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vehicle_length', response.data)

    def test_unknown_type_filter_is_a_400_not_an_empty_list(self):
        response = self.client.get(reverse('vehicle-list-create'), {'type': 'spaceship'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@NO_THROTTLE
class VehicleDeleteGuardTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.vehicle = make_vehicle(self.alice, 'ALICE-1')
        lot = ParkingLot.objects.create(
            name='Central', address='x', latitude='23.810000', longitude='90.412500'
        )
        self.slot = Slot.objects.create(lot=lot, slot_number='A1', is_available=False)
        self.client.force_authenticate(self.alice)

    def test_cannot_deactivate_a_vehicle_with_an_active_booking(self):
        Booking.objects.create(vehicle=self.vehicle, slot=self.slot, reserve_time='2.00')
        response = self.client.delete(reverse('vehicle-detail', args=[self.vehicle.pk]))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.vehicle.refresh_from_db()
        self.assertTrue(self.vehicle.is_active)

    def test_deactivation_succeeds_without_active_bookings(self):
        response = self.client.delete(reverse('vehicle-detail', args=[self.vehicle.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vehicle.refresh_from_db()
        self.assertFalse(self.vehicle.is_active)
