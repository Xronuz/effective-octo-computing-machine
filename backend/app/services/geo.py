"""
XAVFSIZ XONADON — Geo yordamchi funksiyalar.
Haversine masofa hisoblash (EXIF GPS vs muammo koordinatasi tekshiruvi).
"""
from math import asin, cos, radians, sin, sqrt

# Yer radiusi (metr)
_EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Ikki geografik nuqta orasidagi masofani metrlarda qaytaradi."""
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_M * asin(sqrt(a))
