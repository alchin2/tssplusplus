import csv
from unittest.mock import MagicMock, patch

import pytest
import requests

import main as main_module
from tools.session import SessionExpiredError
from main import (
    filter_titles,
    is_excluded_code,
    read_titles_csv,
    scrape_all_sections,
    split_subject_code,
    term_slug,
    write_titles_csv,
)


# --- term_slug ----------------------------------------------------------------


def test_term_slug_fall_confirmed():
    assert term_slug("2026", "2") == "fa26"


def test_term_slug_unconfirmed_perid_falls_back_without_guessing():
    assert term_slug("2027", "9") == "p927"


# --- write_titles_csv -----------------------------------------------------------


def test_write_titles_csv_writes_module_id_code_name(tmp_path, monkeypatch):
    monkeypatch.setattr(main_module, "OFFERED_DIR", tmp_path)
    titles = [
        {"Smobjid": "8401", "Short": "CSE-003", "Stext": "Fluency in IT", "Title": "Fluency in Information Technology"},
        {"Smobjid": "8430", "Short": "CSE-005", "Stext": "", "Title": "Principles of AI"},
    ]

    out_path = write_titles_csv(titles, "2026", "2")

    assert out_path == tmp_path / "fa26.csv"
    with out_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    assert rows[0] == ["module_id", "code", "name"]
    assert rows[1] == ["8401", "CSE-003", "Fluency in IT"]
    assert rows[2] == ["8430", "CSE-005", "Principles of AI"]


def test_write_titles_csv_creates_missing_directory(tmp_path, monkeypatch):
    nested = tmp_path / "data" / "offered"
    monkeypatch.setattr(main_module, "OFFERED_DIR", nested)

    out_path = write_titles_csv([], "2026", "2")

    assert out_path.exists()
    assert nested.is_dir()


# --- read_titles_csv -----------------------------------------------------------


def test_read_titles_csv_round_trips_write_titles_csv(tmp_path, monkeypatch):
    monkeypatch.setattr(main_module, "OFFERED_DIR", tmp_path)
    titles = [{"Smobjid": "8401", "Short": "CSE-003", "Stext": "Fluency in IT", "Title": ""}]
    write_titles_csv(titles, "2026", "2")

    rows = read_titles_csv("2026", "2")

    assert rows == [{"module_id": "8401", "code": "CSE-003", "name": "Fluency in IT"}]


def test_read_titles_csv_missing_file_exits_with_actionable_message(tmp_path, monkeypatch):
    monkeypatch.setattr(main_module, "OFFERED_DIR", tmp_path)

    with pytest.raises(SystemExit) as exc_info:
        read_titles_csv("2026", "2")

    assert "--titles-only" in str(exc_info.value)


# --- is_excluded_code / filter_titles ----------------------------------------


def test_is_excluded_code_matches_dept_x_prefix():
    assert is_excluded_code("MATH-X010") is True
    assert is_excluded_code("EDS-XSD324A") is True


def test_is_excluded_code_matches_trailing_x_suffix():
    assert is_excluded_code("LIAB-001AX") is True
    assert is_excluded_code("COMM-110X") is True


def test_is_excluded_code_matches_lowercase():
    assert is_excluded_code("math-x010") is True
    assert is_excluded_code("liab-001ax") is True


def test_is_excluded_code_does_not_match_regular_code():
    assert is_excluded_code("MATH-010B") is False
    assert is_excluded_code("CSE-100") is False


def test_is_excluded_code_none_input():
    assert is_excluded_code(None) is False


def test_filter_titles_drops_x_prefixed_and_suffixed_codes():
    titles = [
        {"Smobjid": "1", "Short": "MATH-010B"},
        {"Smobjid": "2", "Short": "MATH-X010"},
        {"Smobjid": "3", "Short": "CSE-100"},
        {"Smobjid": "4", "Short": "LIAB-001AX"},
        {"Smobjid": "5", "Short": "EDS-XSD324A"},
    ]

    kept = filter_titles(titles)

    assert [t["Smobjid"] for t in kept] == ["1", "3"]


# --- split_subject_code -----------------------------------------------------


def test_split_subject_code_with_hyphenated_short():
    assert split_subject_code("MATH-010B") == ("MATH", "010B")


def test_split_subject_code_bare_subject():
    assert split_subject_code("CSE") == ("CSE", None)


def test_split_subject_code_space_separated():
    assert split_subject_code("CSE 100") == ("CSE", "100")


def test_split_subject_code_none_input():
    assert split_subject_code(None) == (None, None)


def test_split_subject_code_empty_string():
    assert split_subject_code("") == (None, None)


# --- scrape_all_sections ------------------------------------------------------
# Workers build their own thread-local sessions, so every test also patches
# main.build_session. Tests exercising a specific per-course side_effect
# ordering pass workers=1 for determinism.


def make_row(code, module_id, name="Some Course"):
    return {"module_id": module_id, "code": code, "name": name}


@patch("main.build_session")
@patch("main.upsert_course_document")
@patch("main.ensure_indexes")
@patch("main.get_collection")
@patch("main.scrape_course_sections")
@patch("main.read_titles_csv")
def test_scrape_all_sections_scrapes_and_upserts_every_course(
    mock_read_titles_csv, mock_scrape_course, mock_get_collection, mock_ensure_indexes,
    mock_upsert, mock_build_session, monkeypatch,
):
    monkeypatch.setattr(main_module.time, "sleep", lambda s: None)
    mock_read_titles_csv.return_value = [
        make_row("CSE-100", "1"),
        make_row("MATH-010B", "2"),
        make_row("CSE-101", "3"),
    ]
    mock_scrape_course.return_value = {"module_id": "x"}
    fake_collection = MagicMock()
    mock_get_collection.return_value = fake_collection

    scraped = scrape_all_sections("2026", "2", workers=2)

    assert scraped == 3
    assert mock_scrape_course.call_count == 3
    mock_ensure_indexes.assert_called_once_with(fake_collection)
    assert mock_upsert.call_count == 3


@patch("main.build_session")
@patch("main.upsert_course_document")
@patch("main.ensure_indexes")
@patch("main.get_collection")
@patch("main.scrape_course_sections")
@patch("main.read_titles_csv")
def test_scrape_all_sections_skips_course_on_network_error_but_continues(
    mock_read_titles_csv, mock_scrape_course, mock_get_collection, mock_ensure_indexes,
    mock_upsert, mock_build_session, monkeypatch,
):
    monkeypatch.setattr(main_module.time, "sleep", lambda s: None)
    mock_read_titles_csv.return_value = [make_row("CSE-100", "1"), make_row("CSE-101", "2")]
    mock_scrape_course.side_effect = [requests.RequestException("boom"), {"module_id": "2"}]
    mock_get_collection.return_value = MagicMock()

    scraped = scrape_all_sections("2026", "2", workers=1)

    assert scraped == 1
    assert mock_upsert.call_count == 1


@patch("main.get_collection")
@patch("main.read_titles_csv")
def test_scrape_all_sections_no_titles(mock_read_titles_csv, mock_get_collection, monkeypatch):
    monkeypatch.setattr(main_module.time, "sleep", lambda s: None)
    mock_read_titles_csv.return_value = []
    mock_get_collection.return_value = MagicMock()

    scraped = scrape_all_sections("2026", "2")

    assert scraped == 0


@patch("main.build_session")
@patch("main.upsert_course_document")
@patch("main.ensure_indexes")
@patch("main.get_collection")
@patch("main.scrape_course_sections")
@patch("main.read_titles_csv")
def test_scrape_all_sections_aborts_run_when_session_expires(
    mock_read_titles_csv, mock_scrape_course, mock_get_collection, mock_ensure_indexes,
    mock_upsert, mock_build_session, monkeypatch,
):
    monkeypatch.setattr(main_module.time, "sleep", lambda s: None)
    mock_read_titles_csv.return_value = [
        make_row("CSE-100", "1"),
        make_row("MATH-010B", "2"),
        make_row("CSE-101", "3"),
    ]
    mock_scrape_course.side_effect = SessionExpiredError("cookie expired")
    mock_get_collection.return_value = MagicMock()

    with pytest.raises(SystemExit) as exc_info:
        scrape_all_sections("2026", "2", workers=1)

    assert "cookie expired" in str(exc_info.value)
    mock_upsert.assert_not_called()
