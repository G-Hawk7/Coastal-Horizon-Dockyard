from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api.berths import router as berths_router

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Coastal Horizon Dockyard API",
    description="Berth and Dockyard Management REST API",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(berths_router)

@app.get("/")
def root():
    return {"message": "Coastal Horizon Dockyard API is running."}