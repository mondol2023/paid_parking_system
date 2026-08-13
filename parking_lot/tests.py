"""Regression tests for lot search validation, slot creation and lot deactivation."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import override_settings
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from booking.models import Booking
from vehicle_registration.tests import NO_THROTTLE, make_vehicle

from .models import ParkingLot, Slot
from .views import MAX_SEARCH_LIMIT, MAX_SEARCH_RADIUS_KM


@NO_THROTTLE
class NearestLotsValidationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.client.force_authenticate(self.user)
        self.url = reverse('lot-nearest')

    def search(self, **params):
        return self.client.get(self.url, dict({'lat': '23.8103', 'lng': '90.4125'}, **params))

    def test_missing_coordinates_are_a_400(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_numeric_radius_is_a_400_not_a_500(self):
        response = self.search(radius='soon')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_numeric_limit_is_a_400_not_a_500(self):
        response = self.search(limit='many')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_positive_radius_and_limit_are_rejected(self):
        self.assertEqual(self.search(radius='0').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.search(limit='0').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.search(radius='-5').status_code, status.HTTP_400_BAD_REQUEST)

    def test_out_of_range_coordinates_are_rejected(self):
        self.assertEqual(
            self.client.get(self.url, {'lat': '120', 'lng': '0'}).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_radius_is_clamped_to_the_maximum(self):
        # A lot ~1000 km away must stay out of the result set even though the
        # caller asked for a 20000 km radius.
        far_lot = ParkingLot.objects.create(
            name='Far', address='x', latitude='14.000000', longitude='90.412500'
        )
        Slot.objects.create(lot=far_lot, slot_number='A1')

        response = self.search(radius='20000')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['search']['radius_km'], MAX_SEARCH_RADIUS_KM)
        self.assertEqual(response.data['results'], [])

    def test_limit_is_clamped_to_the_maximum(self):
        for index in range(MAX_SEARCH_LIMIT + 5):
            lot = ParkingLot.objects.create(
                name=f'Lot {index}', address='x',
                latitude='23.810000', longitude='90.412500',
            )
            Slot.objects.create(lot=lot, slot_number='A1')

        response = self.search(limit='999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], MAX_SEARCH_LIMIT)

    def test_search_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.search().status_code, status.HTTP_401_UNAUTHORIZED)


@NO_THROTTLE
class LotSlotsTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            'root', 'root@example.com', 'pw-root-123', is_staff=True
        )
        self.member = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.lot = ParkingLot.objects.create(
            name='Central', address='x', latitude='23.810000', longitude='90.412500'
        )
        self.client.force_authenticate(self.staff)
        self.url = reverse('lot-slots', args=[self.lot.pk])

    def test_creating_a_slot_keeps_total_slots_in_sync(self):
        response = self.client.post(self.url, {'slot_number': 'A1'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lot.refresh_from_db()
        self.assertEqual(self.lot.total_slots, 1)

    def test_duplicate_slot_number_is_a_409_not_a_500(self):
        self.assertEqual(
            self.client.post(self.url, {'slot_number': 'A1'}, format='json').status_code,
            status.HTTP_201_CREATED,
        )
        duplicate = self.client.post(self.url, {'slot_number': 'A1'}, format='json')
        self.assertEqual(duplicate.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('slot_number', duplicate.data)
        # The failed INSERT must not have left the transaction unusable: the
        # view still queried the lot afterwards and only one slot exists.
        self.assertEqual(self.lot.slots.count(), 1)

    def test_non_staff_cannot_add_slots(self):
        self.client.force_authenticate(self.member)
        response = self.client.post(self.url, {'slot_number': 'B1'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_available_filter_returns_only_free_slots(self):
        Slot.objects.create(lot=self.lot, slot_number='A1')
        Slot.objects.create(lot=self.lot, slot_number='A2', is_available=False)
        response = self.client.get(self.url, {'available': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row['slot_number'] for row in response.data['slots']], ['A1'])


@NO_THROTTLE
class LotDeactivationTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            'root', 'root@example.com', 'pw-root-123', is_staff=True
        )
        self.lot = ParkingLot.objects.create(
            name='Central', address='x', latitude='23.810000', longitude='90.412500'
        )
        self.slot = Slot.objects.create(lot=self.lot, slot_number='A1', is_available=False)
        self.client.force_authenticate(self.staff)
        self.url = reverse('lot-detail', args=[self.lot.pk])

    def test_lot_with_active_bookings_cannot_be_deactivated(self):
        owner = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        Booking.objects.create(
            vehicle=make_vehicle(owner, 'ALICE-1'),
            slot=self.slot,
            reserve_time=Decimal('2.00'),
        )
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.lot.refresh_from_db()
        self.assertTrue(self.lot.is_active)

    def test_lot_without_active_bookings_is_deactivated(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.lot.refresh_from_db()
        self.assertFalse(self.lot.is_active)

    def test_deactivated_lot_disappears_from_the_list(self):
        self.client.delete(self.url)
        listing = self.client.get(reverse('lot-list-create'))
        self.assertEqual(listing.data['count'], 0)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)


@NO_THROTTLE
class AvailableSlotsCountTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.lot = ParkingLot.objects.create(
            name='Central', address='x', latitude='23.810000', longitude='90.412500'
        )
        Slot.objects.create(lot=self.lot, slot_number='A1')
        Slot.objects.create(lot=self.lot, slot_number='A2')
        Slot.objects.create(lot=self.lot, slot_number='A3', is_available=False)
        self.client.force_authenticate(self.user)

    def test_count_is_correct_with_and_without_prefetch(self):
        self.assertEqual(self.lot.available_slots_count, 2)
        prefetched = ParkingLot.objects.prefetch_related('slots').get(pk=self.lot.pk)
        self.assertEqual(prefetched.available_slots_count, 2)

    @override_settings(DEBUG=True)
    def test_the_list_endpoint_does_not_run_a_count_query_per_lot(self):
        for index in range(5):
            lot = ParkingLot.objects.create(
                name=f'Lot {index}', address='x',
                latitude='23.810000', longitude='90.412500',
            )
            Slot.objects.create(lot=lot, slot_number='A1')

        # Six lots: the query count must not scale with them (prefetch reuse).
        with self.assertNumQueries(3):
            response = self.client.get(reverse('lot-list-create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 6)
