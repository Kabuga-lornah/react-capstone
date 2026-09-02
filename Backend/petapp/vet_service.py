from __future__ import annotations

import math
from typing import Dict, List
from urllib.parse import urlencode

import requests
from django.conf import settings

NEARBY_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
DEFAULT_RADIUS_METERS = 5000
MAX_RADIUS_METERS = 20000


class VetLookupUnavailable(Exception):
    """Raised when the server has no Google Places credentials configured."""


class VetLookupError(Exception):
    """Raised when the Places API fails or returns an error status."""


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearby_vet_clinics(lat: float, lng: float, radius_meters: int = DEFAULT_RADIUS_METERS) -> List[Dict]:
    api_key = getattr(settings, "GOOGLE_PLACES_API_KEY", "")

    if not api_key:
        raise VetLookupUnavailable(
            "Nearby vet search is not configured on the server. Set the GOOGLE_PLACES_API_KEY environment variable."
        )

    radius_meters = max(500, min(radius_meters, MAX_RADIUS_METERS))

    try:
        response = requests.get(
            NEARBY_SEARCH_URL,
            params={
                "location": f"{lat},{lng}",
                "radius": radius_meters,
                "type": "veterinary_care",
                "key": api_key,
            },
            timeout=10,
        )
    except requests.RequestException as error:
        raise VetLookupError(f"Could not reach Google Places: {error}") from error

    if response.status_code != 200:
        raise VetLookupError(f"Google Places returned an error (status {response.status_code}).")

    payload = response.json()
    status = payload.get("status")

    if status not in ("OK", "ZERO_RESULTS"):
        raise VetLookupError(f"Google Places returned status {status}.")

    clinics = []
    for place in payload.get("results", []):
        geometry = place.get("geometry", {}).get("location") or {}
        place_lat = geometry.get("lat")
        place_lng = geometry.get("lng")

        clinics.append(
            {
                "place_id": place.get("place_id"),
                "name": place.get("name"),
                "address": place.get("vicinity", ""),
                "rating": place.get("rating"),
                "user_ratings_total": place.get("user_ratings_total"),
                "is_open_now": place.get("opening_hours", {}).get("open_now"),
                "distance_km": round(_haversine_km(lat, lng, place_lat, place_lng), 1)
                if place_lat is not None and place_lng is not None
                else None,
                "maps_url": "https://www.google.com/maps/search/?api=1&"
                + urlencode(
                    {
                        "query": place.get("name", ""),
                        "query_place_id": place.get("place_id", ""),
                    }
                ),
            }
        )

    clinics.sort(key=lambda item: item["distance_km"] if item["distance_km"] is not None else float("inf"))
    return clinics
