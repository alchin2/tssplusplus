from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.terms import available_terms, default_term, quarter_term, term_sort_key


@pytest.fixture
def fake_settings(tmp_path):
    fake = SimpleNamespace(
        offered_dir=tmp_path, scraped_quarters_path=tmp_path / "scraped_quarters.txt", term=None,
    )
    available_terms.cache_clear()
    with patch("app.terms.settings", fake):
        yield fake
    available_terms.cache_clear()


def _offered(tmp_path, *terms):
    for term in terms:
        (tmp_path / f"{term}.csv").write_text("module_id,code,name\n")


def test_quarter_term_maps_blink_labels():
    assert quarter_term("Fall 2026") == "fa26"
    assert quarter_term("Winter 2027") == "wi27"
    assert quarter_term("Summer Session I 2027") is None


def test_term_sort_key_orders_seasons_within_a_year():
    terms = ["fa26", "sp27", "wi27", "fa27", "su27"]
    assert sorted(terms, key=term_sort_key) == ["fa26", "wi27", "sp27", "su27", "fa27"]


def test_term_needs_both_marker_and_csv(fake_settings, tmp_path):
    # wi27's CSV was committed mid-scrape, but the scrape never finished.
    _offered(tmp_path, "fa26", "wi27")
    fake_settings.scraped_quarters_path.write_text("Fall 2026\n")
    assert available_terms() == ["fa26"]
    assert default_term() == "fa26"


def test_marker_without_csv_is_not_servable(fake_settings, tmp_path):
    _offered(tmp_path, "fa26")
    fake_settings.scraped_quarters_path.write_text("Fall 2026\nWinter 2027\n")
    assert available_terms() == ["fa26"]


def test_tss_term_is_always_available_and_pins_default(fake_settings, tmp_path):
    _offered(tmp_path, "fa26", "wi27")
    fake_settings.scraped_quarters_path.write_text("Fall 2026\n")
    fake_settings.term = "wi27"
    assert available_terms() == ["wi27", "fa26"]
    assert default_term() == "wi27"


def test_no_marker_file_and_no_tss_term_means_no_terms(fake_settings, tmp_path):
    _offered(tmp_path, "fa26")
    assert available_terms() == []
    assert default_term() is None
