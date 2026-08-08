# Scraper automation

`check-schedule-publication.yml` runs the project's scrapers off UCSD's
live Blink dates instead of a hardcoded schedule. It runs daily at
9pm Pacific and can be triggered manually (`workflow_dispatch`).

## check-schedule-publication.yml

[`check_publication.py`](../../scrapers/helpers/check_publication.py) reads
the "Schedule of Classes is available online" dates from Blink's
[publication schedule][pub]. If today (Pacific) is the day after any of
them, it runs, in order:

catalog scrape → restore `cookie.txt` from `TSS_COOKIE` →
`tss_scraper --titles-only` → `mark_offered_courses.py` → commit `data/`
(auto-redeploys Render) → full section scrape into MongoDB.

Two crons (`0 4` + `0 5` UTC) cover both DST offsets so one always lands
on 9pm Pacific; a guard step no-ops the other. Scheduled runs only fire
on `main`.

> [!NOTE]
> The section scrape needs a valid `TSS_COOKIE`. Because this workflow only
> fires the day after a quarter publishes (a rare, predictable event),
> refreshing the cookie manually around those dates is enough — there's no
> nightly job, so the cookie's 2FA/MFA login never needs automating.

[pub]: https://blink.ucsd.edu/instructors/courses/schedule-of-classes/publication.html

## Alerts

If the section scrape fails on an expired cookie (`tss_scraper` exits on
401/403), the workflow posts cookie-refresh steps to `DISCORD_WEBHOOK_URL`.
The step skips itself if that secret is unset.

## Secrets

Add under **Settings → Secrets and variables → Actions**:

| Secret | Required | Notes |
| --- | --- | --- |
| `TSS_COOKIE` | Yes | Restored into `scrapers/tss_scraper/cookie.txt` |
| `MONGODB_URI` | Yes | Section scrape's MongoDB target |
| `DISCORD_WEBHOOK_URL` | Optional | Dead-cookie alert |

`GITHUB_TOKEN` is built in; the workflow grants it `contents: write` to push.

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
