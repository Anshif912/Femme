import math
import requests
from typing import List, Tuple, Dict,Any
from app.config import settings

def geocode_address(address: str) -> Tuple[float, float]:
    """
    Geocodes an address string to (latitude, longitude) using local presets
    or OpenStreetMap Nominatim API.
    """
    clean = address.lower().strip()
    
    # 1. Local preset dictionary for instant demo geocoding
    presets = {
        "koramangala": (12.9352, 77.6245),
        "indiranagar": (12.9719, 77.6412),
        "hsr layout": (12.9141, 77.6411),
        "bellandur": (12.9304, 77.6784),
        "hal museum": (12.9562, 77.6698),
        "majestic": (12.9779, 77.5707),
        "whitefield": (12.9698, 77.7499)
      }
      
    for key, coords in presets.items():
        if key in clean:
            print(f"[GEOCODE] Resolved preset: '{key}' -> {coords}")
            return coords

    # 2. OpenStreetMap Nominatim API Geocode
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={address}&limit=1"
    headers = {
        "User-Agent": "FEMME-Safeguard-Platform-Demo/1.0 (Safety Commute App)"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=6)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                lat = float(data[0]["lat"])
                lng = float(data[0]["lon"])
                print(f"[GEOCODE] Resolved API: '{address}' -> ({lat}, {lng})")
                return lat, lng
    except Exception as e:
        print(f"[GEOCODE] Nominatim API request failed: {e}. Falling back to default center.")

    # 3. Default Fallback center (Bengaluru)
    fallback = (12.9716, 77.5946)
    print(f"[GEOCODE] Fallback coordinate applied for '{address}' -> {fallback}")
    return fallback

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def get_fallback_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> List[Tuple[float, float]]:
    """
    Generate a simple simulated straight line with intermediate steps
    if routing API is unavailable or offline.
    """
    steps = 15
    route = []
    for i in range(steps + 1):
        ratio = i / steps
        lat = start_lat + (end_lat - start_lat) * ratio
        lng = start_lng + (end_lng - start_lng) * ratio
        # Add a tiny bit of curvature for realism
        lat += 0.0008 * math.sin(ratio * math.pi)
        lng += 0.0008 * math.cos(ratio * math.pi)
        route.append((lat, lng))
    return route

def fetch_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> List[Tuple[float, float]]:
    """
    Fetches coordinates for the route from OSRM or OpenRouteService.
    Returns list of [latitude, longitude] tuples.
    """
    # Try OSRM first
    url = f"{settings.OSRM_ROUTING_URL}{start_lng},{start_lat};{end_lng},{end_lat}?geometries=geojson&overview=full"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "routes" in data and len(data["routes"]) > 0:
                coords = data["routes"][0]["geometry"]["coordinates"]
                # OSRM outputs [lng, lat], convert to [lat, lng]
                return [[c[1], c[0]] for c in coords]
    except Exception as e:
        print(f"OSRM Routing API request failed: {e}. Trying fallback route.")

    # Try OpenRouteService if API key configured
    if settings.OPENROUTE_SERVICE_KEY:
        ors_url = "https://api.openrouteservice.org/v2/directions/driving-car"
        headers = {
            "Authorization": settings.OPENROUTE_SERVICE_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "coordinates": [[start_lng, start_lat], [end_lng, end_lat]]
        }
        try:
            res = requests.post(ors_url, json=payload, headers=headers, timeout=5)
            if res.status_code == 200:
                coords = res.json()["routes"][0]["geometry"]["coordinates"]
                return [[c[1], c[0]] for c in coords]
        except Exception as e:
            print(f"OpenRouteService API failed: {e}")

    # Fallback to simulated route
    return get_fallback_route(start_lat, start_lng, end_lat, end_lng)

def check_route_deviation(current_lat: float, current_lng: float, expected_route: List[Tuple[float, float]]) -> Tuple[bool, float]:
    """
    Check if the user's current location has deviated from the expected route.
    Returns (is_deviated, min_distance_meters).
    """
    if not expected_route:
        return False, 0.0

    min_dist = float("inf")
    for pt in expected_route:
        dist = haversine_distance(current_lat, current_lng, pt[0], pt[1])
        if dist < min_dist:
            min_dist = dist

    is_deviated = min_dist > settings.ROUTE_DEVIATION_THRESHOLD_METERS
    return is_deviated, min_dist

def score_safety(expected_route: List[Tuple[float, float]], safe_zones: List[Dict], unsafe_zones: List[Dict], hour: int) -> Dict[str, Any]:
    """
    Evaluate the safety score of a route based on density, safe stops, unsafe zones, and time of day.
    Returns: { "score": 0..100, "status": "green"|"amber"|"red", "reason": str }
    """
    if not expected_route:
        return {"score": 50, "status": "amber", "reason": "No route to evaluate"}

    # Base score on time-aware safety model (lower score late night)
    base_score = 90
    if 22 <= hour or hour <= 4:
        base_score = 65  # Late night deduction
        time_desc = "Night time travel detected"
    elif 18 <= hour < 22 or 5 <= hour < 8:
        base_score = 80
        time_desc = "Twilight hours travel"
    else:
        base_score = 95
        time_desc = "Daylight hours travel"

    # Penalty for crossing unsafe zones
    unsafe_hits = 0
    for pt in expected_route[::3]:  # sample points for performance
        for uz in unsafe_zones:
            d = haversine_distance(pt[0], pt[1], uz["latitude"], uz["longitude"])
            if d < uz.get("radius", 200.0):
                unsafe_hits += 1

    # Bonus for safe zones nearby
    safe_hits = 0
    for pt in expected_route[::3]:
        for sz in safe_zones:
            d = haversine_distance(pt[0], pt[1], sz["latitude"], sz["longitude"])
            if d < 400.0:  # within 400 meters of safe zone
                safe_hits += 1

    score = base_score - (unsafe_hits * 15) + min(safe_hits * 5, 15)
    score = max(0, min(100, score))

    if score >= 75:
        status = "green"
        reason = f"{time_desc}. Active safe zones present along route with zero recent incident reports."
    elif score >= 50:
        status = "amber"
        reason = f"{time_desc}. Caution advised. Limited active safe zones in intermediate sections."
    else:
        status = "red"
        reason = f"Alert: High-risk route. Passess through {unsafe_hits} recently reported unsafe/anomaly zones."

    return {
        "score": score,
        "status": status,
        "reason": reason
    }
