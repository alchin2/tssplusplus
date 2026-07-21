"""
Course title scraping via YUCSD_I_SM_TITLE's confirmed $filter pagination
pattern.
"""

import time

import requests

from tools.session import get

PAGE_SIZE = 100
REQUEST_DELAY_SEC = 0.3


def fetch_titles(session: requests.Session, peryr: str, perid: str, max_records: int | None = None):
    """Paginates YUCSD_I_SM_TITLE via $filter -- the confirmed-working
    bulk query pattern."""
    records = []
    skip = 0
    while True:
        resp = get(
            session,
            "YUCSD_I_SM_TITLE",
            {
                "$filter": f"Peryr eq '{peryr}' and Perid eq '{perid}'",
                "$top": PAGE_SIZE,
                "$skip": skip,
            },
        )
        resp.raise_for_status()
        page = resp.json().get("value", [])
        if not page:
            break

        records.extend(page)
        print(f"  fetched {len(page)} titles (total so far: {len(records)})")

        if max_records and len(records) >= max_records:
            return records[:max_records]
        if len(page) < PAGE_SIZE:
            break

        skip += PAGE_SIZE
        time.sleep(REQUEST_DELAY_SEC)

    return records
