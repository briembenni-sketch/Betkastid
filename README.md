# Betkastið — landing page

A modern, green-themed site for **Betkastið**, the Icelandic sports &
prediction podcast — _„Hverjar eru líkurnar?"_ It's a small multi-page static site —
**Forsíða**, **Þættir** (a filterable episode archive with an on-site player) and
**Hafa samband** — sharing one header/footer and taking cues from chessafterdark.is,
with a distinctive sports-book identity built around a green palette.

## Stack

No build step. Plain, static, fast.

- `index.html` — **Forsíða**: hero, stats, listen/follow, category teasers, VIP CTA
- `thaettir.html` — **Þættir**: the full, filterable episode archive + in-page player
- `hafa-samband.html` — **Hafa samband**: contact details + a short "Um okkur" section
- shared inline SVG icon sprite, header and footer on every page; JSON-LD (`PodcastSeries`) on the front page
- `styles.css` — design system (CSS variables), layout, animations, responsive
- `script.js` — mobile nav, sticky header, scroll-reveal, animated stat counters, scroll-spy
- `episodes.js` — fetches every episode live from the public RSS feed (CORS-enabled),
  classifies each by topic, and powers the search + count-pill filters, a per-episode detail
  modal (Spotify description + Spotify/Apple/YouTube links) and the sticky in-page player
- `assets/` — brand imagery wired into the page: wordmark logo (header/footer), app icons
  (favicon / apple-touch), podcast cover (social preview) and host cut-out photos
  (hero, About panel, VIP band) — web-optimized from the source files in `Betkast logo og myndir/`

## Design

- **Type:** Bricolage Grotesque (display) · Hanken Grotesk (body) · Space Mono (labels/odds)
- **Color:** deep-emerald dark theme across every page with vivid green accents
- **Details:** odds ticker, live per-episode Spotify artwork, search + count-pill filters,
  episode detail modal, tabular-num stats, soft depth
- **Accessibility:** semantic HTML, skip link, visible focus rings, AA contrast,
  `prefers-reduced-motion` support, keyboard-friendly nav, 44px+ touch targets

Built with the `frontend-design`, `web-design-guidelines`, and `ui-ux-pro-max` skills.

## Run locally

Any static server works, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Content notes

Content (episodes, rating, handles, contact) is drawn from Betkastið's public
Spotify show and site. A few outbound links are marked with `NOTE:` comments in
`index.html` and should be pointed at exact URLs when available:

- **Episodes** — pulled live from the RSS feed (`anchor.fm/s/10a51d438/podcast/rss`) in the
  browser, auto-classified into topic filters, and each plays in-page via its audio enclosure,
  so new episodes appear automatically with no code changes
- **Apple Podcasts / YouTube** — currently link to a search for "Betkastið"
- **„Gerast VIP"** — currently links to betkastid.is; swap for the real subscription URL
- **Source images** — the originals in `Betkast logo og myndir/` are large (~210 MB of
  full-resolution PNGs). The site only uses the optimized derivatives in `assets/`, so the
  originals can safely be removed from the repo (or moved to release storage) to keep clones small

> Betkastið hvetur til ábyrgrar spilahegðunar. 18+.
