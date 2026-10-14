<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Transactions go through the `TransactionRepository` in `src/lib/finance/store.ts`, backed by the `transactions` table with per-user RLS (user_id defaults to auth.uid(), never sent by the client) — screens stay storage-agnostic and isolation is enforced by the database.
- Old browser-saved transactions are only read for the opt-in import (`local-import.ts`, idempotent via import_key) and never deleted automatically — protects data during migration.
- Private pages live under `src/routes/_authenticated/`; `/auth` and `/reset-password` are public — the guard runs client-side because the session lives in the browser.
- Chat interpretation runs in the `interpretMessage` server function (`src/lib/ai/`) via Lovable AI Gateway, and its output is re-validated in `validate.ts` before any preview — keeps the key server-side and never trusts the AI; the AI never saves, only explicit user confirmation writes to the repository.
- Demo data must be flagged `sample: true` and visibly labeled "Exemplo" — the product must never present demo or simulated features as real.
- Favorites and category budgets use account-scoped database tables through preferencesStore; clear its cache on account changes — no private settings persist across accounts.
- A null movement pot_id denotes the existing principal reserve; other pots use savings_pots with a composite owner foreign key — preserve old reserve data and enforce pot ownership in the database.
- Future monthly entries are generated only through generateSchedule and saved as one reviewed batch through TransactionRepository — retain exact cents and require confirmation before any writes.
- Audio uses an authenticated bounded multipart server route; receipt input shares interpretMessage and its existing validation — no file is stored and no AI output writes directly.
- History exports are generated on demand in the browser with formula-safe CSV and real PDF/XLSX files — financial data stays in the authenticated client.
