import math
from typing import List, Tuple

from django.db.models import Q

from .models import ParkingLot


EARTH_RADIUS_KM = 6371.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Returns the great-circle distance in km between two (lat, lon) points.
    Uses the Haversine formula — accurate to ~0.5% for short distances.
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def get_nearest_lots(
    user_lat: float,
    user_lon: float,
    radius_km: float = 10.0,
    limit: int = 10,
) -> List[Tuple[ParkingLot, float]]:
    """
    Returns a sorted list of (ParkingLot, distance_km) tuples
    within `radius_km` of the given coordinates.

    Strategy:
      1. Bounding-box pre-filter on DB (fast, index-friendly).
      2. Exact Haversine refinement in Python (no PostGIS needed).
      3. Sort by distance, return top `limit`.
    """
    # 1° latitude ≈ 111 km, so delta_lat = radius / 111
    delta_lat = radius_km / 111.0

    # Longitude degrees shrink towards the poles: cos(lat) → 0, so the divisor
    # can be zero (ZeroDivisionError) or tiny (a box wider than the globe).
    cos_lat = math.cos(math.radians(user_lat))
    if cos_lat <= 0.0:
        delta_lon = 180.0
    else:
        delta_lon = min(radius_km / (111.0 * cos_lat), 180.0)

    lat_filter = {
        'latitude__gte': max(user_lat - delta_lat, -90.0),
        'latitude__lte': min(user_lat + delta_lat, 90.0),
    }

    west, east = user_lon - delta_lon, user_lon + delta_lon
    if west < -180.0 or east > 180.0:
        # The box crosses the antimeridian (or spans every meridian); a plain
        # BETWEEN would exclude the wrapped half, so skip the longitude filter
        # and let the exact Haversine pass below do the filtering.
        lon_query = Q()
    else:
        lon_query = Q(longitude__gte=west, longitude__lte=east)

    candidate_lots = ParkingLot.objects.filter(
        Q(is_active=True, **lat_filter) & lon_query
    ).prefetch_related('slots', 'rates')

    results = []
    for lot in candidate_lots:
        dist = haversine_distance(
            user_lat, user_lon,
            float(lot.latitude), float(lot.longitude)
        )
        if dist <= radius_km:
            results.append((lot, round(dist, 3)))

    results.sort(key=lambda x: x[1])
    return results[:limit]