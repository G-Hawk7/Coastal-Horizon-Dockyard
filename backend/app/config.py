import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env when running locally (Vercel injects env vars directly)
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL", "")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-change-in-env")
JWT_ALGORITHM = "HS256"
PASSWORD_PEPPER = os.getenv("PASSWORD_PEPPER", "")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://coastal-horizon-dockyard-su3j.vercel.app")

# Cookie security: True in production (Vercel sets VERCEL=1), False on localhost HTTP
IS_PRODUCTION = os.getenv("VERCEL") == "1"