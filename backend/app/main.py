from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import buildings, courses, meta, route

app = FastAPI(title="TSS++ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(courses.router)
app.include_router(meta.router)
app.include_router(buildings.router)
app.include_router(route.router)


@app.get("/health")
def health():
    return {"status": "ok"}
