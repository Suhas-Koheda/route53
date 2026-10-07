import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, FRONTEND_URL, engine
from routers import auth as auth_router, zones as zones_router, records as records_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Route53 Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.environ.get("FRONTEND_URL", FRONTEND_URL)],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

app.include_router(auth_router.router)
app.include_router(zones_router.router)
app.include_router(records_router.router)
