import re

from fastapi import APIRouter, Depends

from app.catalog import get_catalog, normalize_code
from app.offered import get_code_to_module_id_index, get_offered_index
from app.schemas import Meta
from app.terms import available_terms, default_term, selected_term

router = APIRouter(prefix="/api", tags=["meta"])

# A course code's subject prefix: "CSE 8A", TSS's "CSE-008A" -> "CSE".
# Real prefixes are 2-5 letters; this drops catalog parse noise (a stray
# "CLASSIC" or bare "P") that would otherwise match ordinary words in an
# uploaded transcript.
_SUBJECT_RE = re.compile(r"^([A-Z]{2,5})[\s-]*\d")


def subject_prefixes() -> list[str]:
    """Every course subject prefix the app knows of, from the catalog and
    every servable term's offered courses. Catalog files are named by
    catalog page, not subject (BIOL.json holds BILD/BIMM/..., GPS.json
    holds GPCO/GPEC/...), so this can't be derived from `depts`."""
    codes = [c["code"] for c in get_catalog()]
    for term in available_terms():
        codes.extend(entry["code"] for entry in get_offered_index(term).values())
    return sorted({m.group(1) for code in codes if (m := _SUBJECT_RE.match(code.strip().upper()))})


@router.get("/meta", response_model=Meta)
def get_meta(term: str = Depends(selected_term)):
    """GET /api/meta?term=wi27 -- the servable terms plus catalog-wide
    facts the frontend needs before any search: the department dropdown
    options, the subject prefixes transcript parsing matches against, and
    the headline counts (offered_count is for `term`)."""
    catalog = get_catalog()
    offered_codes = get_code_to_module_id_index(term)
    return Meta(
        term=term,
        default_term=default_term(),
        terms=available_terms(),
        depts=sorted({c["dept"] for c in catalog}),
        subjects=subject_prefixes(),
        course_count=len(catalog),
        offered_count=sum(1 for c in catalog if normalize_code(c["code"]) in offered_codes),
    )
