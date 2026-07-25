from unittest.mock import MagicMock

import pytest

import tools.session as session_module
from tools.session import BASE, get, load_cookie


def test_load_cookie_missing_file_exits(tmp_path, monkeypatch):
    monkeypatch.setattr(session_module, "COOKIE_FILE", tmp_path / "cookie.txt")

    with pytest.raises(SystemExit):
        load_cookie()


def test_load_cookie_empty_file_exits(tmp_path, monkeypatch):
    cookie_file = tmp_path / "cookie.txt"
    cookie_file.write_text("   ", encoding="utf-8")
    monkeypatch.setattr(session_module, "COOKIE_FILE", cookie_file)

    with pytest.raises(SystemExit):
        load_cookie()


def test_load_cookie_returns_stripped_contents(tmp_path, monkeypatch):
    cookie_file = tmp_path / "cookie.txt"
    cookie_file.write_text("  abc123  \n", encoding="utf-8")
    monkeypatch.setattr(session_module, "COOKIE_FILE", cookie_file)

    assert load_cookie() == "abc123"


def test_get_exits_when_session_expired():
    fake_session = MagicMock()
    fake_session.get.return_value = MagicMock(status_code=401)

    with pytest.raises(SystemExit):
        get(fake_session, "YUCSD_I_SM_TITLE")


def test_get_adds_sap_client_param_and_returns_response():
    fake_session = MagicMock()
    fake_resp = MagicMock(status_code=200)
    fake_session.get.return_value = fake_resp

    result = get(fake_session, "YUCSD_I_SM_TITLE", {"$top": 10})

    fake_session.get.assert_called_once_with(
        f"{BASE}/YUCSD_I_SM_TITLE",
        params={"$top": 10, "sap-client": "500"},
        timeout=30,
    )
    assert result is fake_resp
