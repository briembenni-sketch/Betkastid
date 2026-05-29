# Betkastið — landing page

A modern, green-themed landing page for **Betkastið**, the Icelandic sports &
prediction podcast — _„Hverjar eru líkurnar?"_ It takes cues from chessafterdark.is
(sticky nav → host hero → stats → listen/follow → topic categories → full episode
archive with an on-site player → about → footer) with a distinctive sports-book
identity built around a green palette.

## Stack

No build step. Plain, static, fast.

- `index.html` — markup + inline SVG icon sprite + JSON-LD (`PodcastSeries`)
- `styles.css` — design system (CSS variables), layout, animations, responsive
- `script.js` — mobile nav, sticky header, scroll-reveal, animated stat counters, scroll-spy
- `episodes.js` — fetches every episode live from the public RSS feed (CORS-enabled),
  classifies each by topic, and renders the filterable archive + the sticky in-page player
- `assets/` — brand imagery wired into the page: wordmark logo (header/footer), app icons
  (favicon / apple-touch), podcast cover (social preview) and host cut-out photos
  (hero, About panel, VIP band) — web-optimized from the source files in `Betkast logo og myndir/`

## Design

- **Type:** Bricolage Grotesque (display) · Hanken Grotesk (body) · Space Mono (labels/odds)
- **Color:** light editorial base with a deep-emerald hero/footer and vivid green accents
- **Details:** odds ticker, betting-slip episode artwork, tabular-num stats, soft depth
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
