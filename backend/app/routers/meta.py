from fastapi import APIRouter, Depends

from app.catalog import get_catalog, normalize_code
from app.offered import get_code_to_module_id_index
from app.schemas import Meta
from app.terms import available_terms, default_term, selected_term

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/meta", response_model=Meta)
def get_meta(term: str = Depends(selected_term)):
    """GET /api/meta?term=wi27 -- the servable terms plus catalog-wide
    facts the frontend needs before any search: the department dropdown
    options and the headline counts (offered_count is for `term`)."""
    catalog = get_catalog()
    offered_codes = get_code_to_module_id_index(term)
    return Meta(
        term=term,
        default_term=default_term(),
        terms=available_terms(),
        depts=sorted({c["dept"] for c in catalog}),
        course_count=len(catalog),
        offered_count=sum(1 for c in catalog if normalize_code(c["code"]) in offered_codes),
    )
