"""
Sched-string parser for YUCSD_CON_EVENTS rows: a pure function, no I/O,
that turns the free-text `Sched` field into structured meeting (+
optional final exam) data. Same role as the catalog scraper's
prereq_parser, for a different grammar.

Real examples this is built against:

  "M, W, F 08:00 AM - 08:50 AM In Person @ Peterson Hall Room 110\n"
  "Final Examination 12/07/2026 08:00 AM - 10:59 AM In Person"

  "W 04:00 PM - 04:50 PM In Person @ Mandeville Center Room B-104"
  (no final exam line -- discussions don't always have one)

Both lines end the same way -- "<start> - <end> <modality> [@ <location>]"
-- they only differ in what comes before it (days, or "Final
Examination <date>"), so one regex covers both.
"""

import re
from datetime import datetime

# Ordered longest-first so "Tu"/"Th"/"Sa"/"Su" win over a bare "T"/"S"
# match at the same position -- lets this tokenize both "M, W, F" and a
# concatenated "TuTh"/"MWF" without relying on comma placement.
DAY_TOKEN_RE = re.compile(r"Su|Tu|Th|Sa|M|W|F")
TIME_RE = re.compile(r"\d{1,2}:\d{2}\s*[AP]M")
DATE_RE = re.compile(r"\d{1,2}/\d{1,2}/\d{4}")

TAIL_RE = re.compile(
    r"(?P<start>\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(?P<end>\d{1,2}:\d{2}\s*[AP]M)\s+"
    r"(?P<modality>[A-Za-z ]+?)(?:\s*@\s*(?P<location>.+))?$"
)


def parse_days(days_str: str) -> list[str]:
    """Tokenizes a days substring ("M, W, F", "MWF", "TuTh", ...) into a
    list of canonical day abbreviations, in the order they appear."""
    compact = re.sub(r"[,\s]", "", days_str)
    return DAY_TOKEN_RE.findall(compact)


def _clean(text: str) -> str:
    return " ".join(text.split())


def _parse_tail(text: str) -> dict | None:
    """Parses the "<start> - <end> <modality> [@ <location>]" tail
    shared by both a meeting line and a final exam line."""
    match = TAIL_RE.search(text)
    if not match:
        return None
    location = match.group("location")
    return {
        "start_time": _clean(match.group("start")),
        "end_time": _clean(match.group("end")),
        "modality": _clean(match.group("modality")),
        "location": _clean(location) if location else None,
    }


def _parse_meeting_line(line: str) -> dict:
    empty = {"days": [], "start_time": None, "end_time": None, "modality": None, "location": None}

    time_match = TIME_RE.search(line)
    if not time_match:
        return empty

    tail = _parse_tail(line[time_match.start():])
    if not tail:
        return empty

    return {"days": parse_days(line[: time_match.start()]), **tail}


def _parse_final_exam_line(line: str) -> dict | None:
    date_match = DATE_RE.search(line)
    if not date_match:
        return None

    tail = _parse_tail(line[date_match.end():])
    if not tail:
        return None

    # M/D/YYYY -> ISO YYYY-MM-DD, matching BeginDate/EndDate's format.
    date = datetime.strptime(date_match.group(), "%m/%d/%Y").strftime("%Y-%m-%d")
    return {"date": date, **tail}


def parse_sched(sched: str) -> dict:
    """
    Parses a YUCSD_CON_EVENTS `Sched` string into structured data: the
    meeting's days/start_time/end_time/modality/location, plus an
    optional `final_exam` sub-record when a "Final Examination" line is
    present (discussions/labs often don't have one).

    Falls back to all-None fields (with `raw` preserved) instead of
    raising when the first line doesn't match the known grammar --
    thousands of these get parsed per run and one unrecognized row
    shouldn't take the whole scrape down.
    """
    raw = sched or ""
    lines = [line.strip() for line in raw.split("\n") if line.strip()]

    result = {
        "days": [],
        "start_time": None,
        "end_time": None,
        "modality": None,
        "location": None,
        "final_exam": None,
        "raw": raw,
    }

    if not lines:
        return result

    result.update(_parse_meeting_line(lines[0]))

    for line in lines[1:]:
        if line.lower().startswith("final examination"):
            result["final_exam"] = _parse_final_exam_line(line)

    return result
