"""
Session plumbing for the TSS scraper: loads the session cookie from
cookie.txt, builds a requests.Session with the headers TSS expects, and
wraps GET requests with a session-expiry check.
"""

import sys
from pathlib import Path

import requests

BASE = (
    "https://tss.ucsd.edu/sap/opu/odata4/sap/yucsd_con_module_sb/"
    "srvd/sap/yucsd_con_module_servicedef/0001"
)
COOKIE_FILE = Path(__file__).resolve().parent.parent / "cookie.txt"


def load_cookie() -> str:
    if not COOKIE_FILE.exists():
        sys.exit(
            f"Missing {COOKIE_FILE}.\n"
            "Paste your TSS session cookie into it (see the setup steps "
            "in this script's docstring)."
        )
    cookie = COOKIE_FILE.read_text(encoding="utf-8").strip()
    if not cookie:
        sys.exit(f"{COOKIE_FILE} is empty.")
    return cookie


def build_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(
        {
            "Accept": "application/json;odata.metadata=minimal;IEEE754Compatible=true",
            "Referer": "https://tss.ucsd.edu/fiori",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Cookie": load_cookie(),
        }
    )
    return s


def get(session: requests.Session, path: str, params: dict | None = None) -> requests.Response:
    full_params = {**(params or {}), "sap-client": "500"}
    resp = session.get(f"{BASE}/{path}", params=full_params, timeout=30)
    if resp.status_code in (401, 403):
        sys.exit(
            f"Got HTTP {resp.status_code} - your session cookie has likely "
            f"expired. Refresh {COOKIE_FILE.name} and try again."
        )
    return resp
