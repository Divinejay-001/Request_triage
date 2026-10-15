# Decisions

## Validation rules (import)

| Case | Behaviour |
| ---- | --------- |
| Missing `external_id`, `requester` or `subject` | Row rejected; reason lists each missing field |
| Empty `description` | Allowed (stored as empty string) |
| `received_at` missing or unparseable | Row rejected with the offending value in the reason |
| Impossible date (e.g. `2026-02-31`) | Rejected; JS `Date` would silently roll it into March, so I check explicitly |
| Purely numeric `received_at` | Rejected as ambiguous (seconds? milliseconds?) |
| `priority` empty | Stored as `normal`, no warning |
| `priority` unrecognised | Row imported as `normal`, with a **warning** in the report |
| Priority casing / surrounding whitespace | Normalised (`" HIGH "` → `high`) |
| Missing required column in the header | Whole file rejected (HTTP 400) — nothing useful can be imported |
| Individual bad rows | Never fail the whole file; each gets a row-specific result |

Row numbers: header is row 1, first data record is row 2. Blank lines are ignored. A multi-line quoted field counts as one row.

Why reject a bad timestamp rather than default it: `received_at` drives sort order, and inventing a date would hide a data problem from the team.

## Duplicate policy

- **Within a file:** first occurrence wins; later rows rejected, naming the first row.
- **Against the database:** incoming row rejected; existing record is **never overwritten**, so a status or owner someone set is not lost on re-import.
- Enforced by a unique index on `external_id` as well as a pre-check, so concurrent imports can't create duplicates.
- Matching is exact after trimming. `req-1` and `REQ-1` are different IDs (I didn't want to guess the source system's rules).

### What this does to the supplied fixture

Importing `fixtures/requests.csv` into an empty database gives **10 imported, 4 rejected**:

| Row | external_id | Outcome |
| --- | ----------- | ------- |
| 11 | REQ-1003 | Rejected: duplicate of row 4 |
| 12 | (blank) | Rejected: missing `external_id` |
| 13 | REQ-1010 | Rejected: missing `subject` |
| 15 | REQ-1012 | Rejected: `received_at` "not-a-date" is invalid |
| 14 | REQ-1011 | Imported: empty `description` is allowed |

Judgment call worth discussing: row 11 is titled "Corrected invoice question", so it may be intended as a correction to REQ-1003. My rule keeps the first row and reports the second as rejected rather than silently overwriting, so the team can see it needs a human decision. An "update on re-import" option is listed under next steps. Also note REQ-1007 has an earlier `received_at` than the rows around it; ordering in the file is not assumed, and the list sorts by `received_at` (newest first).

## Statuses and owners

- Statuses: `open` (default), `in_progress`, `resolved`.
- Owners: fixed list in `server/src/constants.js` (David, Sarah, Priya, Tunde) plus Unassigned (`""`). No user management, as the brief allows. The API validates both fields; the UI reads the lists from `/api/requests/meta`.

## Data model

CSV fields (`external_id`, `received_at`, `requester`, `subject`, `description`, `priority`) plus app-managed `status` and `owner`, and Mongoose `createdAt`/`updatedAt`. `PATCH` only accepts `status` and `owner`, so CSV-origin data can't be edited through the UI.

## Tradeoffs

- Validation is a pure function (`validateCsv`) separate from the DB step, so the rules are unit-testable without MongoDB.
- Search uses a case-insensitive regex (input escaped) over four fields. Fine at this scale; a text index would be better for large data.
- The list endpoint is not paginated.
- Whole file is held in memory (5 MB upload cap).

## Limitations

- No authentication, audit history of status/owner changes, or optimistic-concurrency check (last write wins).
- No automated API/DB integration tests or UI tests; persistence and re-import were meant to be verified manually (see README).
- Dates are displayed in the browser's local timezone; values without a timezone in the CSV are interpreted in the server's timezone.
- The unique/duplicate rule can't "update" an existing request from a newer CSV.

## Next steps

- Integration tests against an in-memory MongoDB.
- Pagination and sorting controls.
- Option to update (rather than reject) existing records on re-import, behind a confirmation.
- Change history per request; real users for owners.
