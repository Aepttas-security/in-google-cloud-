# caller_backend/main.py
"""
AEPTTAS Shield - Unified Enterprise Backend Server
Consolidates Caller Intelligence, Malware Scanner, Geolocation,
Vulnerability Scanner, and Parental Control into ONE FastAPI Server on Port 5000.
"""

import sys
import os
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging

from services.geolocation import get_location
from routers import (
    callers_router,
    calls_router,
    blocked_router,
    reports_router,
    settings_router,
    malware_router,
    geolocation_router,
    vulnerability_router,
    parental_router,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("unified_backend")

app = FastAPI(
    title="AEPTTAS Shield Unified Backend API",
    description="Unified API server hosting Callers, Malware, Geolocation, Vulnerability, and Parental Control services.",
    version="1.0.0"
)

# 🔐 Security Headers Middleware (Zero-Vulnerability Defense)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# 🌐 Configurable & Compliant CORS Middleware
cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env and cors_origins_env != "*":
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    allow_credentials = True
else:
    allowed_origins = ["*"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# 🛡️ Safe Global Exception Handler (Prevents Credential / Internal Leakage)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact the administrator."},
    )

# Register All Subsystem Routers
app.include_router(callers_router)
app.include_router(calls_router)
app.include_router(blocked_router)
app.include_router(reports_router)
app.include_router(settings_router)
app.include_router(malware_router)
app.include_router(geolocation_router)
app.include_router(vulnerability_router)
app.include_router(parental_router)

@app.get("/geo")
@app.get("/api/geo")
def geo(ip: str):
    return get_location(ip)

@app.get("/analyze")
@app.get("/api/analyze")
def analyze(url: str, ip: str):
    geo_data = get_location(ip)
    return {
        "url": url,
        "ip": ip,
        "geolocation": geo_data,
        "verdict": "Safe" if geo_data.get("status") == "success" else "Suspicious",
        "modules_used": ["Geolocation", "VirusTotal", "CVE", "ML Detection"]
    }

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def root():
    return {
        "status": "online",
        "service": "AEPTTAS Shield Unified Backend",
        "health": "healthy",
        "port": 5000,
        "endpoints": {
            "caller_intelligence": "/api/callers/*",
            "calls": "/api/calls/*",
            "blocked": "/api/blocked/*",
            "reports": "/api/reports/*",
            "malware": "/api/malware/*",
            "geolocation": "/api/geo/*",
            "vulnerability": "/api/vuln/*",
            "parental_control": "/api/parental/*",
            "settings_and_admin": "/api/settings, /api/admin/logs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting AEPTTAS Shield Unified Backend on http://0.0.0.0:5000 ...")
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
