# Scraper automation

`check-schedule-publication.yml` runs the project's scrapers off UCSD's
live Blink dates instead of a hardcoded schedule. It runs daily (cron
`0 4` UTC, ~8–9pm Pacific when on time) and can be triggered manually
(`workflow_dispatch`).

## check-schedule-publication.yml

[`check_publication.py`](../../scrapers/helpers/check_publication.py) reads
the "Schedule of Classes is available online" dates from Blink's
[publication schedule][pub]. If a quarter went online 1–7 days ago
(Pacific, `CATCH_UP_DAYS`) and isn't listed in
[`data/scraped_quarters.txt`](../../data/scraped_quarters.txt), it runs,
in order:

open a "Update Course Catalog to <quarter>" issue + Discord message →
catalog scrape → restore `cookie.txt` from `TSS_COOKIE` →
`tss_scraper --titles-only` → commit `data/` (auto-redeploys Render) →
full section scrape into MongoDB → append the quarter to
`data/scraped_quarters.txt`, commit it, and close the issue.

The site's term dropdown only lists a term once it's in
`scraped_quarters.txt` (see `backend/app/terms.py`), so the mid-run
`data/` commit doesn't expose a term whose sections aren't scraped yet.
The newest listed term becomes the site's default.

The scrapers get the published quarter's term code as `TSS_TERM` (e.g.
"Winter 2027" → `wi27`), so the pipeline always scrapes the new quarter.
`tss_scraper` knows the TSS `Perid` for fall (confirmed) and winter
(inferred, unconfirmed) terms (see `TERM_PERIDS` in
`scrapers/tss_scraper/main.py`); other seasons fail with a clear error
until theirs is added.

GitHub often starts scheduled runs hours late, so the check uses a window
rather than an exact time or date. The quarter is only marked scraped
after the section scrape succeeds, so a failed run (e.g. an expired
cookie) is retried the next day until the window closes. To re-scrape a
quarter, delete its line from `scraped_quarters.txt`. Scheduled runs only
fire on `main`.

> [!NOTE]
> The section scrape needs a valid `TSS_COOKIE`. Because this workflow only
> fires the day after a quarter publishes (a rare, predictable event),
> refreshing the cookie manually around those dates is enough — there's no
> nightly job, so the cookie's 2FA/MFA login never needs automating.

[pub]: https://blink.ucsd.edu/instructors/courses/schedule-of-classes/publication.html

## Alerts

When a quarter is first picked up, the workflow opens a GitHub issue titled
"Update Course Catalog to <quarter>" (with cookie-refresh steps) and posts
a link to it in `DISCORD_WEBHOOK_URL`. Retry days reuse the open issue
instead of opening another or re-posting, and the issue is closed with a
comment once the scrape succeeds.

If any scrape step fails, usually on an expired cookie (`tss_scraper` exits on
401/403), the workflow posts cookie-refresh steps and the issue link to
Discord. The quarter stays unmarked, so the next day's run retries it.
Both Discord steps skip themselves if that secret is unset.

## Secrets

Add under **Settings → Secrets and variables → Actions**:

| Secret | Required | Notes |
| --- | --- | --- |
| `TSS_COOKIE` | Yes | Restored into `scrapers/tss_scraper/cookie.txt` |
| `MONGODB_URI` | Yes | Section scrape's MongoDB target |
| `DISCORD_WEBHOOK_URL` | Optional | New-quarter and failure messages |

`GITHUB_TOKEN` is built in; the workflow grants it `contents: write` to push
and `issues: write` to open and close the tracking issue.

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
