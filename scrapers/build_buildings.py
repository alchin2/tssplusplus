"""
Builds data/buildings.json: every building name appearing in tss_scraper's
scraped meeting locations (MongoDB), mapped to its official UCSD record --
GPS coordinates, aliases, street address, and a short display abbreviation.

Sources:
- TSS meeting locations from MongoDB (tss_scraper's collection): "location"
  fields like "Center Hall Room 105". TSS names buildings in full (no
  abbreviations) and truncates long names at ~40 characters.
- UCSD's public GIS "Building Points" layer (no auth required):
  https://admin-enterprise-gis.ucsd.edu/server/rest/services/AdministrationServices/Buildings_Public/MapServer/0
  FacilityLongName + pipe-separated BuildingAliases (which often include the
  official short code, e.g. "Center Hall | CENTR") + Latitude/Longitude.
- The registrar's building-code table as an abbreviation fallback for
  buildings whose GIS aliases carry no code:
  https://registrar.ucsd.edu/StudentLink/bldg_codes.html

Matching order: manual override -> exact (normalized) -> trailing
parenthetical stripped ("Jacobs Hall (EBU1)") -> "- G" expanded to
"- Building G" (Extended Studies) -> truncation-aware prefix match.

Requires a populated MongoDB (run tss_scraper first).

Running it:
  python3 build_buildings.py [--out ../data/buildings.json]
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent / "tss_scraper"))
from tools.storage import get_collection  # noqa: E402

GIS_QUERY_URL = (
    "https://admin-enterprise-gis.ucsd.edu/server/rest/services"
    "/AdministrationServices/Buildings_Public/MapServer/0/query"
)
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "data" / "buildings.json"

# Registrar building codes (registrar.ucsd.edu/StudentLink/bldg_codes.html),
# used as the abbreviation fallback when the GIS aliases carry no code.
# Two registrar typos are corrected so name-matching works: "Conrad Presbys"
# -> "Conrad Prebys", "Fred N. Spies Hall" -> "Fred N. Spiess Hall".
REGISTRAR_CODES = {
    "APM": "Applied Physics & Mathematics Building",
    "ASANT": "Asante Hall",
    "BIO": "Biology Building",
    "BIRCH": "Birch Aquarium",
    "BONN": "Bonner Hall",
    "BSB": "Basic Science Building",
    "CCC": "Cross-Cultural Center",
    "CENTR": "Center Hall",
    "CICC": "Copely International Conference Center",
    "CLICS": "Center for Library & Instructional Computing Services",
    "CLIN": "Clinical Sciences Building",
    "CMG": "Center for Molecular Genetics",
    "CMME": "Center for Molecular Medicine East",
    "CMMW": "Center for Molecular Medicine West",
    "CMRR": "Center for Magnetic Recording Research",
    "CNCB": "Center for Neural Circuits and Behavior",
    "CRB": "Chemistry Research Building",
    "CPMC": "Conrad Prebys Music Center",
    "CSB": "Cognitive Science Building",
    "CTL": "Catalyst",
    "DANCE": "Wagner Dance Facility",
    "DIB": "Design and Innovation Building",
    "DSD": "Deep Sea Drilling Building",
    "EBU1": "Engineering Building Unit 1",
    "EBU2": "Engineering Building Unit 2",
    "EBU3B": "Engineering Building Unit 3",
    "ECKRT": "SIO Library, Eckart Building",
    "ECON": "Economics Building",
    "ERCA": "Eleanor Roosevelt College Administration",
    "FORUM": "Mandell Weiss Forum",
    "GA": "General Academic NTPLL",
    "GEISL": "Geisel Library",
    "GH": "Galbraith Hall",
    "HSS": "Humanities & Social Sciences Building",
    "HUBBS": "Hubbs Hall",
    "IGPP": "Institute of Geophysics & Planetary Physics",
    "IOA": "Institute of the Americas",
    "JEANN": "The Jeannie",
    "KECK": "W.M. Keck Building",
    "LASB": "Latin American Studies Building",
    "LEDDN AUD": "Patrick J. Ledden Auditorium",
    "LFFB": "Leichtag Family Foundation Biomedical Research Building",
    "LIT": "Literature Building",
    "MANDE": "Mandeville Center",
    "MAYER": "Mayer Hall",
    "MCC": "Media Center/Communication Building",
    "MCGIL": "William J. McGill Hall",
    "MET": "Medical Education and Telemedicine",
    "MNDLR": "Mandler Hall",
    "MOS": "Mosaic",
    "MTF": "Medical Teaching Facility",
    "MWEIS": "Mandell Weiss Center",
    "MYR-A": "Mayer Hall Addition",
    "NIERN": "Nierenberg Hall",
    "NSB": "Natural Sciences Building",
    "NTV": "Nierenberg Hall Annex",
    "OAR": "Ocean & Atmospheric Res Bldg",
    "OTRSN": "Otterson Hall",
    "PACIF": "Pacific Hall",
    "PCYNH": "Pepper Canyon Hall",
    "PETER": "Peterson Hall",
    "PFBH": "Powell-Focht Bioengineering Hall",
    "POTKR": "Potiker Theatre",
    "PRICE": "Price Center",
    "RBC": "Robinson Building Complex",
    "RECGM": "Recreation Gym",
    "RITTR": "Ritter Hall",
    "RVCOM": "Revelle Commons",
    "RVPRO": "Revelle College Provost Building",
    "RWAC": "Ridge Walk Academic Complex",
    "SCHOL": "Scholander Hall",
    "SCRB": "Stein Clinical Research Building",
    "SCRPS": "Scripps Building",
    "SDSC": "San Diego Supercomputer Center",
    "SEQUO": "Sequoyah Hall",
    "SERF": "Science & Engineering Research Facility",
    "SME": "Structural & Materials Science Engineering Building",
    "SOLIS": "Faustina Solis Lecture Hall",
    "SPIES": "Fred N. Spiess Hall",
    "SSB": "Social Sciences Building",
    "SSC": "Student Services Center",
    "SVERD": "Sverdrup Hall",
    "TMCA": "Thurgood Marshall College Administration Building",
    "UNEX": "University Extension Complex",
    "UREY": "Urey Hall",
    "URY-A": "Urey Hall Annex",
    "VAF": "Visual Arts Facility",
    "VAUGN": "Vaughan Hall",
    "WFH": "Wells Fargo Hall",
    "WLH": "Warren Lecture Hall",
    "YORK": "Herbert F. York Undergraduate Sciences Building",
}

# TSS building name -> GIS FacilityLongName, for the handful of names the
# rules can't bridge. Ledden Auditorium is a lecture hall inside HSS, so it
# borrows the HSS building record.
MATCH_OVERRIDES = {
    "Coalition Building": "Coalition",
    "Ridgewalk Academic Complex": "Ridge Walk Academic Building",
    "Ledden Auditorium": "Humanities and Social Sciences",
    "Asante House": "Asante House Meeting Rooms",
    "MCTF - Marine Conservation and Technolog": "Marine Conservation and Technology Facility",
    "Leichtag Biomedical Research Building": "Leichtag Family Foundation Biomedical Research Building",
    "Mandell Weiss": "Mandell Weiss Theatre",
    "Biomedical Research Facility II": "Israni Biomedical Research Facility",
    "Medical Education and Telemedicine Cente": "T. Denny Sanford Medical Education and Telemedicine Center",
}

# TSS building name -> abbreviation, where neither the GIS aliases nor the
# registrar table settle it. FAH and TATA are the codes the old WebReg-era
# schedule used for buildings that postdate the registrar table; UNEX covers
# the whole Extension complex (matching what Building G resolves to).
# Buildings with no known code anywhere (Coalition, Podemos, Malk Hall,
# Sumner Auditorium, Warren Student Activity Center) are left null.
ABBR_OVERRIDES = {
    "Ledden Auditorium": "LEDDN AUD",
    "MCTF - Marine Conservation and Technolog": "MCTF",
    "Mandell Weiss": "MWEIS",
    "Robinson Building 1": "RBC",
    "Franklin Antonio Hall": "FAH",
    "Tata Hall": "TATA",
    "Extended Studies and Public Programs - N": "UNEX",
    "Biomedical Research Facility II": "BRF II",
    "ERC Administration South": "ERCA",
    "IGPP - Munk Laboratory": "IGPP",
}

ROOM_SUFFIX_RE = re.compile(r"\s+Room\s+.*$")
TRAILING_PAREN_RE = re.compile(r"\s*\([^)]*\)\s*$")
SINGLE_LETTER_SUFFIX_RE = re.compile(r"^(.*) - ([A-Z])$")
CODE_ALIAS_RE = re.compile(r"^[A-Z][A-Z0-9&-]{1,7}$")


def norm(s: str) -> str:
    s = s.lower().replace("&", "and")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tss_building_names(collection) -> dict[str, int]:
    """Walks every scraped course document and returns each distinct
    building name (meeting location minus the "Room ..." suffix) with its
    meeting count."""
    counts: dict[str, int] = {}

    def walk(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == "location" and isinstance(value, str):
                    building = ROOM_SUFFIX_RE.sub("", value).strip()
                    if building:
                        counts[building] = counts.get(building, 0) + 1
                else:
                    walk(value)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    for doc in collection.find():
        walk(doc)
    return counts


def fetch_gis_buildings() -> list[dict]:
    """Fetches every record from the public Building Points layer,
    paginating past the server's maxRecordCount."""
    features, offset = [], 0
    while True:
        resp = requests.get(
            GIS_QUERY_URL,
            params={
                "where": "1=1",
                "outFields": "*",
                "returnGeometry": "false",
                "f": "json",
                "resultOffset": offset,
            },
            timeout=30,
        )
        resp.raise_for_status()
        page = resp.json()
        if "error" in page:
            raise RuntimeError(f"GIS query failed: {page['error']}")
        features.extend(f["attributes"] for f in page["features"])
        if not page.get("exceededTransferLimit"):
            return features
        offset += len(page["features"])


def build_gis_index(records: list[dict]) -> dict[str, list[dict]]:
    """Maps each normalized building name/alias to the GIS records that
    carry it (aliases can collide, hence the list)."""
    index: dict[str, list[dict]] = {}
    for rec in records:
        variants = [rec.get("FacilityLongName") or ""]
        variants += [a.strip() for a in (rec.get("BuildingAliases") or "").split("|")]
        for variant in variants:
            key = norm(variant)
            if key and rec not in index.setdefault(key, []):
                index[key].append(rec)
    return index


def name_candidates(name: str):
    """Yields the name plus derived forms worth trying against the GIS
    index, in decreasing order of fidelity."""
    yield name
    stripped = TRAILING_PAREN_RE.sub("", name)
    if stripped != name:
        yield stripped
    m = SINGLE_LETTER_SUFFIX_RE.match(name)
    if m:  # "Extended Studies and Public Programs - G" -> "... - Building G"
        yield f"{m.group(1)} - Building {m.group(2)}"


def match_building(name: str, index: dict[str, list[dict]]) -> tuple[dict | None, str]:
    """Returns (GIS record, how it matched) for a TSS building name."""
    if name in MATCH_OVERRIDES:
        recs = index.get(norm(MATCH_OVERRIDES[name]), [])
        return (recs[0], "override") if recs else (None, "override-miss")

    for candidate in name_candidates(name):
        recs = index.get(norm(candidate), [])
        if len(recs) == 1:
            return recs[0], "exact"

    # TSS truncates at ~40 chars: accept a unique GIS name extending ours.
    for candidate in name_candidates(name):
        key = norm(candidate)
        if len(key) < 10:
            continue
        hits = {id(r): r for k, rs in index.items() if k.startswith(key) for r in rs}
        if len(hits) == 1:
            return next(iter(hits.values())), "prefix"

    return None, "unmatched"


def resolve_abbr(tss_name: str, rec: dict | None) -> str | None:
    """Picks a short display code: manual override, then the registrar
    table (matched by name against every known name for the building),
    then any code-like GIS alias."""
    if tss_name in ABBR_OVERRIDES:
        return ABBR_OVERRIDES[tss_name]
    if rec is None:
        return None

    variants = [rec.get("FacilityLongName") or "", tss_name]
    variants += [a.strip() for a in (rec.get("BuildingAliases") or "").split("|")]
    variant_norms = [norm(TRAILING_PAREN_RE.sub("", v)) for v in variants if v]

    # Registrar match: exact name first, then longest containment either way.
    best: tuple[int, str] | None = None
    for code, reg_name in REGISTRAR_CODES.items():
        rn = norm(reg_name)
        for vn in variant_norms:
            if len(vn) < 6:
                continue
            if vn == rn:
                score = 1000 + len(rn)
            elif rn in vn or vn in rn:
                score = len(min(rn, vn, key=len))
            else:
                continue
            if best is None or score > best[0]:
                best = (score, code)
    if best:
        return best[1]

    code_aliases = [
        a.strip()
        for a in (rec.get("BuildingAliases") or "").split("|")
        if CODE_ALIAS_RE.match(a.strip())
    ]
    return min(code_aliases, key=len) if code_aliases else None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    collection = get_collection()
    tss_counts = tss_building_names(collection)
    if not tss_counts:
        sys.exit("No meeting locations found in MongoDB -- run tss_scraper first.")
    print(f"{len(tss_counts)} distinct buildings in scraped TSS data")

    gis_records = fetch_gis_buildings()
    print(f"{len(gis_records)} buildings fetched from UCSD GIS")
    index = build_gis_index(gis_records)

    buildings, unmatched = {}, []
    for tss_name in sorted(tss_counts):
        rec, how = match_building(tss_name, index)
        if rec is None:
            unmatched.append(tss_name)
        aliases = [a.strip() for a in ((rec or {}).get("BuildingAliases") or "").split("|")]
        buildings[tss_name] = {
            "abbr": resolve_abbr(tss_name, rec),
            "name": (rec or {}).get("FacilityLongName"),
            "lat": (rec or {}).get("Latitude"),
            "lng": (rec or {}).get("Longitude"),
            "address": (rec or {}).get("StreetAddress"),
            "aliases": [a for a in aliases if a],
            "match": how,
        }

    out = {
        "_meta": {
            "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "collection": collection.name,
            "tss_buildings": len(tss_counts),
            "matched": len(tss_counts) - len(unmatched),
            "sources": {
                "locations": "MongoDB meeting locations scraped by tss_scraper",
                "gis": GIS_QUERY_URL,
                "codes": "https://registrar.ucsd.edu/StudentLink/bldg_codes.html",
            },
        },
        "buildings": buildings,
    }
    args.out.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.out} ({len(buildings)} buildings, {len(unmatched)} unmatched)")
    for name in unmatched:
        print(f"  UNMATCHED: {name!r} ({tss_counts[name]} meetings)")


if __name__ == "__main__":
    main()
