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
- Transactions go through the `TransactionRepository` interface in `src/lib/finance/store.ts` (currently localStorage) — swap the implementation to add a database without touching screens.
- Chat interpretation runs in the `interpretMessage` server function (`src/lib/ai/`) via Lovable AI Gateway, and its output is re-validated in `validate.ts` before any preview — keeps the key server-side and never trusts the AI; the AI never saves, only explicit user confirmation writes to the repository.
- Demo data must be flagged `sample: true` and visibly labeled "Exemplo" — the product must never present demo or simulated features as real.
