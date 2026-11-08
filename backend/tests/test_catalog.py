import pytest

from app.catalog import catalog_code_aliases, normalize_code, offered_module_id


@pytest.mark.parametrize(
    ("code", "aliases"),
    [
        ("CSE 100", []),
        ("DSC 10/R", ["DSC10", "DSC10R"]),
        ("DSC 40A/R", ["DSC40A", "DSC40AR"]),
        ("HIEA 163/263", ["HIEA163", "HIEA263"]),
        ("HIEU 166/266/166GS", ["HIEU166", "HIEU266", "HIEU166GS"]),
        ("BENG 202/CSE 282", ["BENG202", "CSE282"]),
        ("BENG/BIMM/CSE 181", ["BENG181", "BIMM181", "CSE181"]),
        ("POLI 5 or 5R or 5D or 5DR", ["POLI5", "POLI5R", "POLI5D", "POLI5DR"]),
        ("ANTH 268, COGR 225A", ["ANTH268", "COGR225A"]),
        ("MATH 220A-B-C", ["MATH220A", "MATH220B", "MATH220C"]),
        ("EDS 128 A-B", ["EDS128A", "EDS128B"]),
        ("ECE 145AL-BL-CL", ["ECE145AL", "ECE145BL", "ECE145CL"]),
        ("VIS 128A–E", ["VIS128A", "VIS128B", "VIS128C", "VIS128D", "VIS128E"]),
        ("GSS 21-22-23-25", ["GSS21", "GSS22", "GSS23", "GSS25"]),
    ],
)
def test_catalog_code_aliases_cover_every_tss_code(code, aliases):
    result = catalog_code_aliases(code)
    # The plain normalized code always comes first, as the exact match.
    assert result[0] == normalize_code(code)
    assert result[1:] == aliases


def test_catalog_code_aliases_skip_unparseable_parts():
    # A title the scraper left in the code: no aliases beyond the plain one.
    assert catalog_code_aliases("COMM 114M CSI: Communication and the Law (4)") == [
        "COMM114M CSI: COMMUNICATION AND THE LAW (4)"
    ]


def test_offered_module_id_matches_any_covered_code():
    course = {"code": "DSC 10/R"}
    assert offered_module_id(course, {"DSC10R": "2"}) == "2"
    assert offered_module_id(course, {"DSC10": "1", "DSC10R": "2"}) == "1"
    assert offered_module_id(course, {"DSC20": "3"}) is None
