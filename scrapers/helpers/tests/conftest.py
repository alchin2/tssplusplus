import sys
from pathlib import Path

# check_publication.py / check_pass_window.py are flat modules in helpers/;
# put that dir on sys.path so tests can import them regardless of cwd.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
