from fastapi import APIRouter, Depends

from app.offered import get_term_courses
from app.schemas import Meta
from app.terms import available_terms, default_term, selected_term

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/meta", response_model=Meta)
def get_meta(term: str = Depends(selected_term)):
    """GET /api/meta?term=wi27 -- the servable terms plus catalog-wide
    facts the frontend needs before any search: the department dropdown
    options and the headline counts (offered_count is for `term`)."""
    courses = get_term_courses(term)
    return Meta(
        term=term,
        default_term=default_term(),
        terms=available_terms(),
        depts=sorted({c["dept"] for c in courses}),
        course_count=len(courses),
        offered_count=sum(1 for c in courses if c["module_id"] is not None),
    )
