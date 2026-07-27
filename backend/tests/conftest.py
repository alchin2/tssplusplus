import sys
from pathlib import Path

# app/ is a regular package but backend/ itself isn't installed --
# same reasoning as tss_scraper/tests/conftest.py: put backend/ on
# sys.path so tests can `import app...` regardless of cwd.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
