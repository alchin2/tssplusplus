from fastapi import APIRouter

from app.catalog import get_catalog
from app.config import settings
from app.schemas import Meta

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/meta", response_model=Meta)
def get_meta():
    """GET /api/meta -- term + catalog-wide facts the frontend needs
    before any search: the department dropdown options and the home
    page's headline counts."""
    catalog = get_catalog()
    return Meta(
        term=settings.term,
        depts=sorted({c["dept"] for c in catalog}),
        course_count=len(catalog),
        offered_count=sum(1 for c in catalog if c["offered_this_qtr"]),
    )
