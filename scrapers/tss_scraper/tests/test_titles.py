from unittest.mock import MagicMock, patch

import tools.titles as titles_module
from tools.titles import PAGE_SIZE, fetch_titles


def make_response(records):
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {"value": records}
    return resp


def make_records(n, start=0):
    return [{"Smobjid": str(i), "Short": f"COURSE {i}"} for i in range(start, start + n)]


@patch("tools.titles.get")
def test_fetch_titles_stops_on_short_page(mock_get, monkeypatch):
    monkeypatch.setattr(titles_module.time, "sleep", lambda s: None)
    page = make_records(5)
    mock_get.return_value = make_response(page)

    session = object()
    result = fetch_titles(session, "2026", "2")

    assert result == page
    mock_get.assert_called_once_with(
        session,
        "YUCSD_I_SM_TITLE",
        {"$filter": "Peryr eq '2026' and Perid eq '2'", "$top": PAGE_SIZE, "$skip": 0},
    )


@patch("tools.titles.get")
def test_fetch_titles_walks_multiple_full_pages(mock_get, monkeypatch):
    monkeypatch.setattr(titles_module.time, "sleep", lambda s: None)
    page1 = make_records(PAGE_SIZE, start=0)
    page2 = make_records(PAGE_SIZE, start=PAGE_SIZE)
    page3 = make_records(10, start=2 * PAGE_SIZE)
    mock_get.side_effect = [make_response(page1), make_response(page2), make_response(page3)]

    session = object()
    result = fetch_titles(session, "2026", "2")

    assert result == page1 + page2 + page3
    assert mock_get.call_count == 3
    skips = [c.args[2]["$skip"] for c in mock_get.call_args_list]
    assert skips == [0, PAGE_SIZE, 2 * PAGE_SIZE]


@patch("tools.titles.get")
def test_fetch_titles_stops_when_page_is_empty(mock_get, monkeypatch):
    monkeypatch.setattr(titles_module.time, "sleep", lambda s: None)
    page1 = make_records(PAGE_SIZE, start=0)
    mock_get.side_effect = [make_response(page1), make_response([])]

    session = object()
    result = fetch_titles(session, "2026", "2")

    assert result == page1
    assert mock_get.call_count == 2


@patch("tools.titles.get")
def test_fetch_titles_max_records_truncates_within_first_page(mock_get, monkeypatch):
    monkeypatch.setattr(titles_module.time, "sleep", lambda s: None)
    page1 = make_records(PAGE_SIZE, start=0)
    mock_get.return_value = make_response(page1)

    session = object()
    result = fetch_titles(session, "2026", "2", max_records=20)

    assert result == page1[:20]
    mock_get.assert_called_once()


@patch("tools.titles.get")
def test_fetch_titles_max_records_truncates_across_pages(mock_get, monkeypatch):
    monkeypatch.setattr(titles_module.time, "sleep", lambda s: None)
    page1 = make_records(PAGE_SIZE, start=0)
    page2 = make_records(PAGE_SIZE, start=PAGE_SIZE)
    mock_get.side_effect = [make_response(page1), make_response(page2)]

    session = object()
    result = fetch_titles(session, "2026", "2", max_records=150)

    assert result == (page1 + page2)[:150]
    assert mock_get.call_count == 2
