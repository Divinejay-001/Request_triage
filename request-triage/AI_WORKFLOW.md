# AI Workflow

## Tools used

- Chatgpt, used to explain the assignment and Claude(anthropic) to generate the first version of the full stack (model, import service, routes, React UI, tests, docs).

## Useful interactions

- Asked for a plain-language explanation of the assignment before coding, which clarified the CSV's role (input data, not the app) and the main judgment calls (duplicates, missing fields, bad dates).
- Asked Claude to build the project, with validation separated from DB code so the rules could be tested without a database. Then i created an actual database using mongodb atlas to test the app locally.

## Something checked or corrected

- The first `npm test` script (`node --test test/`) failed on Node 22 because the directory was treated as a module path; it was changed to `node --test`.


## How I verified

- Connected the app to my own MongoDB database and started the server and client.
- Ran the automated tests with `npm test` in `server/`; all 7 pass, including one against the real fixture.
- Followed the manual checks in the README:
  - Imported `fixtures/requests.csv` through the UI and read the import report.
  - Searched for a name and confirmed the matching request appeared.
  - Edited a request's status and owner and confirmed the change saved.
  - Restarted the server and confirmed my edit was still there.
  - Imported the same CSV again and confirmed it was blocked because the requests already exist, which matches my duplicate rule.
- Ran `npm run build` for the client and it succeeded.
- Unverified: [e.g. very large files, other browsers].

## Limits of AI use

- The assignment's own README was not available to the AI; the rules came from a guide's description of the assignment, then were checked against the real fixture. Re-check them against the official README.
