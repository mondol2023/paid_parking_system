import math
from typing import List, Tuple
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
    delta_lon = radius_km / (111.0 * math.cos(math.radians(user_lat)))

    candidate_lots = ParkingLot.objects.filter(
        is_active=True,
        latitude__gte=user_lat - delta_lat,
        latitude__lte=user_lat + delta_lat,
        longitude__gte=user_lon - delta_lon,
        longitude__lte=user_lon + delta_lon,
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