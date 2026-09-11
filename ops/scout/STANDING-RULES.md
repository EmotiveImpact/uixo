# X UI Scout — standing operating rules (Red, 2026-09-11)

Authoritative for X UI Scout digests and harvests.

1. **Resource-first** — usable tools over Inspiration; still include Inspiration when linked; do not aggressively skip.
2. **All links** — expand `note_tweet` / entities; dump every destination URL into `data/uixo-candidates.json` on main.
3. **Watchlist** — `data/ledger/list-poster-watchlist` is priority seed, not exclusive; keep discovering; promote regulars.
4. **Staging only** — candidates + ledgers + `public/assets/{id}.png` on main; never auto-edit live `src/data.ts`.
5. **Thumbs** — screenshot first; on failure fetch `og:image` / `twitter:image`; do not leave pending when OG exists.
6. **Board** — GitHub Issues (`agent-board` + `function:*` + `project:uixo`); signed bodies; do not rewrite `LATEST.md`.
7. **Compute** — scout box + GitHub only; not Red's hard drive unless asked.
8. **X** — `user-X--red` only; no browser scrape; no invented posts.
9. **Digests** — weekdays 08:30 Europe/London; silent if nothing new.
10. **Pastes** — ingest every distinct URL from Red; confirm checklist.

Signed into agent profile + skill `uixo-x-list-harvest` + weekday routine.
