"""
FastAPI Application Entrypoint for SignBridge.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from signbridge import __version__
from signbridge.api.routes import router, get_inference_service
from signbridge.config import settings, PROJECT_ROOT

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload models once at application startup
    service = get_inference_service()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="SignBridge ISL Assistant API",
    description=(
        "Production-grade backend for Indian Sign Language (ISL) recognition and two-way communication. "
        "Preserves existing scikit-learn models and MediaPipe feature representations while adding "
        "rejection handling, vocabulary inspection, and phrase reference library."
    ),
    version=__version__,
    lifespan=lifespan,
)

# CORS configuration allowing local frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Mount ISL Video clips static files
isl_clips_dir = PROJECT_ROOT / "frontend" / "public" / "isl_clips"
if isl_clips_dir.exists():
    app.mount("/isl_clips", StaticFiles(directory=str(isl_clips_dir)), name="isl_clips")

# Mount frontend production build if present
frontend_dist = PROJECT_ROOT / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("signbridge.api.app:app", host=settings.host, port=settings.port, reload=settings.debug)
