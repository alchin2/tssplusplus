# Scraper automation

Two scheduled workflows run the project's scrapers off UCSD's live Blink
dates instead of hardcoded ones. Both run at midnight Pacific and can be
triggered manually (`workflow_dispatch`).

| Workflow | Does |
| --- | --- |
| `check-schedule-publication.yml` | The day after a new quarter's Schedule of Classes goes online, rebuilds the catalog and commits `data/` to `main`. |
| `nightly-pass-scrape.yml` | While any enrollment pass is active, re-scrapes live sections/seats into MongoDB. |



## check-schedule-publication.yml

[`check_publication.py`](../../scrapers/helpers/check_publication.py) reads
the "Schedule of Classes is available online" dates from Blink's
[publication schedule][pub]. If today (Pacific) is the day after any of
them, it runs, in order:

catalog scrape → restore `cookie.txt` from `TSS_COOKIE` →
`tss_scraper --titles-only` → `mark_offered_courses.py` → commit `data/`
(auto-redeploys Render) → full section scrape into MongoDB.



## nightly-pass-scrape.yml

[`check_pass_window.py`](../../scrapers/helpers/check_pass_window.py) reads
each `<Ordinal> Pass (continuing students)` window from Blink's
[enrollment start page][enr]. If today (Pacific) is inside any window, it
restores `cookie.txt` and runs `tss_scraper` (full scrape into MongoDB).
Windows are per-pass, so the gap between passes stays inactive.

[pub]: https://blink.ucsd.edu/instructors/courses/schedule-of-classes/publication.html
[enr]: https://blink.ucsd.edu/instructors/courses/enrollment/start.html

## Alerts

If a scrape fails on an expired cookie (`tss_scraper` exits on 401/403),
both workflows post cookie-refresh steps to `DISCORD_WEBHOOK_URL`. The step
skips itself if that secret is unset.

## Secrets

Add under **Settings → Secrets and variables → Actions**:

| Secret | Required | Notes |
| --- | --- | --- |
| `TSS_COOKIE` | Yes | Restored into `scrapers/tss_scraper/cookie.txt` |
| `MONGODB_URI` | Yes | Section scrape's MongoDB target |
| `DISCORD_WEBHOOK_URL` | Optional | Dead-cookie alert |

`GITHUB_TOKEN` is built in; workflow 1 grants it `contents: write` to push.

### Refreshing TSS_COOKIE

The cookie is a login session and expires. To refresh: log into
<https://tss.ucsd.edu/fiori> → DevTools (F12) → Network → Fetch/XHR →
reload → copy any `tss.ucsd.edu` request's full `cookie` header → paste it
as the new `TSS_COOKIE` value.

## Tests

```sh
cd scrapers/helpers
pytest
```
