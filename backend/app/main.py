from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import FRONTEND_URL
from app.database import Base, engine
from app.routers import admin, auth, berths, groups

# Ensure all tables exist on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Coastal Horizon Dockyard API",
    description="Secure Multi-User Dockyard & Berth Management System with JWT Auth, RBAC, Shared Groups, and Admin Dashboard.",
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Strict CORS restricted to deployed frontend + local Vite dev server
allowed_origins = list(
    dict.fromkeys(
        origin
        for origin in [
            FRONTEND_URL.rstrip("/"),
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        if origin
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# Consistent error responses with no internal stack traces leaked to clients
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    messages = [
        f"{'.'.join(str(loc) for loc in err['loc'] if loc != 'body')}: {err['msg']}"
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "; ".join(messages) or "Invalid request payload."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, _exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred."},
    )


# Register modular routers
app.include_router(auth.router)
app.include_router(berths.router)
app.include_router(groups.router)
app.include_router(admin.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "coastal-horizon-dockyard", "version": "2.0.0"}