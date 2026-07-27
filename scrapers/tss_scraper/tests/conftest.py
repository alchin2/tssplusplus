import sys
from pathlib import Path

# main.py is a flat module and tools/ is a namespace package (no
# __init__.py), same layout as catalog_scraper. Put the tss_scraper dir
# on sys.path so tests can import both regardless of cwd.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
