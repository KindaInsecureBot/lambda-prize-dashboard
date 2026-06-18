# Lambda Prize Dashboard

A live BI dashboard for the Logos **λPrize** program. Static site (Astro + React),
deployed to GitHub Pages, refreshed nightly from public GitHub data.

Design language reuses `logos-co/flywheels.logos.co`: IBM Plex Mono, blueprint
frame, λ-diamond notation, dot stage-trackers, outlined metadata pills.

## Screens

- **Overview** — headline counts (prizes, won, submissions, resubmissions, rule
  flags, builders, reviewers) + submissions-per-prize bar chart.
- **Under Review** — cards from the review tracker (`ecosystem` #112 sub-issues):
  prize, builder, reviewer, open/closed, links to the review issue and Discord thread.
- **Catalog** — every prize with size, status stage-tracker, submission/builder
  counts, winner, and links to spec + solution.
- **Submissions** — every solution PR grouped by prize, classified **initial** vs
  **resubmission**, with **rule-violation flags** (>3 submissions per builder, or
  more than one submission per week).

## Data sources (all public, no auth required at runtime)

- `logos-co/lambda-prize` — prize catalog (`prizes/LP-XXXX.md`), `solutions/`, PRs.
- `logos-co/ecosystem` issue #112 — submission review tracker (sub-issues).

## Develop

```bash
npm install
npm run fetch    # pull live data -> src/data/data.json (GITHUB_TOKEN optional, raises rate limit)
npm run dev      # http://localhost:4321
npm run build    # static build -> dist/
```

## Deploy

`.github/workflows/deploy.yml` runs on push to `main`, nightly (~05:17 UTC), and
on-demand (`workflow_dispatch`). It fetches fresh data, builds, and publishes to
GitHub Pages. Enable Pages → Source: **GitHub Actions** in repo settings.

## Resubmission rules (per the λPrize Terms)

- Max **3 submissions** per builder per prize.
- At most **one submission per week** per builder per prize.

Both are computed from solution-PR open dates and surfaced on the Submissions screen.
