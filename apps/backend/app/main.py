"""StoreSight backend — FastAPI entrypoint."""

import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.system import root_router
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.redis import close_redis
from app.db.session import close_database
from app.services.cameras import run_camera_health_loop

settings = get_settings()

logger = logging.getLogger("uvicorn.error")

_health_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (%s)", settings.app_name, settings.app_env)
    global _health_task
    if settings.camera_health_check_enabled:
        _health_task = asyncio.create_task(run_camera_health_loop())
    yield
    if _health_task is not None:
        _health_task.cancel()
        with suppress(asyncio.CancelledError):
            await _health_task
    await close_redis()
    await close_database()


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description=(
        "Decision-support platform for multi-camera retail intelligence, loss prevention "
        "and store analytics. Observe, track, associate, understand, score, explain, alert."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request, call_next):
    # Enforce HTTPS redirect if forwarded as HTTP in production
    proto = request.headers.get("x-forwarded-proto", "")
    if proto == "http" and settings.app_env == "production":
        from fastapi.responses import RedirectResponse
        url = request.url.replace(scheme="https")
        return RedirectResponse(url=str(url), status_code=301)

    response = await call_next(request)

    # Security Headers (Production-Grade OWASP/HSTS Compliance)
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    # Static asset caching policy
    path = request.url.path
    if path.startswith("/assets") or "/assets/" in path:
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif path.endswith("/dashboard") or path.endswith("/dashboard/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    return response

app.include_router(root_router)
app.include_router(api_router, prefix=settings.api_v1_prefix)

_DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if (_DIST_DIR / "assets").exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/assets", StaticFiles(directory=_DIST_DIR / "assets"), name="assets")
    app.mount(f"{settings.api_v1_prefix}/assets", StaticFiles(directory=_DIST_DIR / "assets"), name="api_assets")


@app.get("/favicon.svg", include_in_schema=False)
@app.get("/favicon.ico", include_in_schema=False)
@app.get(f"{settings.api_v1_prefix}/favicon.svg", include_in_schema=False)
async def favicon_endpoint():
    from fastapi.responses import FileResponse
    fav_path = _DIST_DIR / "favicon.svg"
    if fav_path.exists():
        return FileResponse(fav_path, media_type="image/svg+xml")
    return {"status": "ok"}


@app.get("/og-image.svg", include_in_schema=False)
@app.get(f"{settings.api_v1_prefix}/og-image.svg", include_in_schema=False)
async def og_image_endpoint():
    from fastapi.responses import FileResponse
    og_path = _DIST_DIR / "og-image.svg"
    if og_path.exists():
        return FileResponse(og_path, media_type="image/svg+xml")
    return {"status": "ok"}


@app.exception_handler(404)
async def custom_404_handler(request, exc):
    from fastapi.responses import JSONResponse, RedirectResponse
    # If the user is navigating to a dashboard subpath, redirect to SPA
    if "/dashboard" in request.url.path:
        return RedirectResponse(url=f"{settings.api_v1_prefix}/dashboard")
    detail = getattr(exc, "detail", "Resource not found")
    return JSONResponse(
        status_code=404,
        content={"detail": detail, "path": request.url.path},
    )


@app.get("/dashboard", include_in_schema=False)
async def dashboard_alias():
    """Root-level alias so operators reach the SPA without the API prefix."""
    from fastapi.responses import RedirectResponse

    return RedirectResponse(url=f"{settings.api_v1_prefix}/dashboard", status_code=307)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": __version__,
        "docs": "/docs",
        "health": "/health",
        "api": settings.api_v1_prefix,
    }
