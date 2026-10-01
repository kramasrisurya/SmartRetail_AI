"""API layer.

System endpoints (/health, /version) are exposed at the root so infrastructure
probes never need to know the API version prefix; domain endpoints are
organized under versioned routers in app/api/v1/.
"""
