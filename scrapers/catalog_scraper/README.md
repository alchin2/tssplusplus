# catalog_scraper

Scrapes UCSD's public course catalog (`catalog.ucsd.edu`) for every
department's course list: course code, name, and raw prerequisite text,
parsed into a simple AND/OR tree. No login required -- it's a public site.

## How it works

1. Reads department codes from `valid_codes.txt`.
2. For each code, fetches `catalog.ucsd.edu/courses/<CODE>.html` and
   parses course listings out of the HTML (`tools/course_scraper.py`).
3. Parses each course's raw prerequisite text into a 2-level AND/OR tree
   (`tools/json_parser.py`).
4. Writes one JSON file per department to `data/catalog/<CODE>.json`.

BIOL is a special case: its catalog page bundles every biology
sub-department (BILD, BIMM, BIPN, ...) under one URL, so `main.py` splits
those courses back out by their real prefix before writing.

If a department code scrapes zero courses, it's treated as not found and
dropped from `valid_codes.txt` on that run.

## Running it

```
cd scrapers/catalog_scraper
python3 main.py
```

Output lands in `data/catalog/`, one JSON file per department.

## Dependencies

`httpx`, `beautifulsoup4` -- see `requirements.txt` at the repo root.
