import os

JWT_SECRET = os.getenv("JWT_SECRET", "nlmvs-prod-super-secret-key-2026-legal-metrology-goi")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8
PORT = int(os.getenv("PORT", "5000"))
HOST = os.getenv("HOST", "0.0.0.0")
