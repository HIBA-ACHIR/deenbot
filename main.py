# microservices/auth-service/app/main.py
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine

# from api.v1.auth_routes import router as auth_router
#from deenbot.api.v1.tasksroutes import router as tasksroutes
from api.v1.moufti_routes import router as mouftiroutes
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="City Service")


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.on_event("shutdown")
async def shutdown():
    pass


import os

UPLOAD_DIR = "uploads"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
# app.include_router(auth_router)
# app.include_router(tasksroutes)
app.include_router(mouftiroutes)


# if __name__ == "__main__":
#     import uvicorn

#     uvicorn.run(
#         app, host="0.0.0.0", port=8001
#     )  # Run on port 8001 to avoid conflict with city-service
