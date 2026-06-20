from typing import List, Tuple, Dict

# Deterministic safety scoring based on weighted distances (no external data).
# We assume we have pre‑computed distances (in meters) to the relevant features.

WEIGHTS = {
    "police": 20,
    "hospital": 15,
    "unsafe_zone": 20,
    "community": 15,
    "historical": 10,
    "night": 10,
    "route_isolation": 10,
}

def _score_component(value: float, max_distance: float = 5000) -> int:
    """Convert a distance value (meters) to a score 0‑100 where closer = higher.
    For simplicity we linearly map 0..max_distance to 100..0.
    """
    if value >= max_distance:
        return 0
    return int(round(100 * (1 - value / max_distance)))

def compute_score(distances: Dict[str, float]) -> Dict:
    """Calculate a deterministic safety score.
    `distances` should contain keys matching WEIGHTS (e.g., 'police', 'hospital', ...).
    Returns a dict with `score` (0‑100), `risk` ('LOW'|'MEDIUM'|'HIGH'), and `reasons` list.
    """
    total = 0
    reasons = []
    for key, weight in WEIGHTS.items():
        dist = distances.get(key, 5000)  # default far away
        component_score = _score_component(dist)
        weighted = component_score * weight / 100
        total += weighted
        if component_score > 70:
            reasons.append(f"Close to {key.replace('_', ' ')}")
    final_score = int(round(total))
    # Determine risk level
    if final_score >= 71:
        risk = "LOW"
    elif final_score >= 41:
        risk = "MEDIUM"
    else:
        risk = "HIGH"
    return {
        "score": final_score,
        "risk": risk,
        "reasons": reasons,
    }
