# Data audit findings (2026-06-18) — corrections to apply

## 1. Submission detection MUST be file-based, not title-based
A PR is a **submission** iff it adds/edits a file under `solutions/` matching a single
`solutions/LP-XXXX.md`, AND it edits at most 1 `prizes/` file (to exclude bulk
template/catalog PRs). The old `/^solution/i` title regex was wrong:
- MISSED real submissions with non-"Solution:" titles: #45 (Gmin2, LP-0012),
  #25/#27/#30 (soloking1412, LP-0016 reopens), #17 (soloking1412, LP-0005),
  #26/#29 (soloking1412, LP-0015).
- FALSE POSITIVES (touch solutions/ but are template/catalog PRs — EXCLUDE):
  #5 "PSF Prize update" (18 prize files), #24 "Align L-Prizes with template"
  (15 prize files), #93 "Align templates..." (LP-0000 template).
- EXCLUDE LP-0000 (template) and any solutions file for a prize not in `prizes/`.

## 2. Review status source of truth = OPEN solution PR (NOT #112 sub-issues)
"Under review" = there is an **open** solution PR for that prize. Build the Under
Review board from open solution PRs grouped by prize. Enrich each with reviewer +
Discord link by matching (prize, builder) against #112 sub-issues, and also use the
PR's `requested_reviewers` (e.g. weboko requested on #65/#73/#77). If no reviewer
known, show "unassigned". Do NOT drive review state from sub-issue open/closed.

## 3. Canonical submission set (file-based, LP-0000 excluded): 54
Per-prize (subs | builders | OPEN PRs | winner):
- LP-0002: 4 | 3 | 2 open
- LP-0003: 3 | 2 | 2 open
- LP-0005: 7 | 5 | 4 open
- LP-0008: 4 | 2 | 0 open
- LP-0009: 3 | 2 | 0 open | WON mmlado (#19 merged)
- LP-0010: 3 | 2 | 0 open | WON mmlado (#21 merged)
- LP-0012: 2 | 2 | 0 open | WON bristinWild (#14 merged)
- LP-0013: 10 | 6 | 5 open
- LP-0015: 2 | 1 | 0 open
- LP-0016: 11 | 5 | 2 open
- LP-0017: 4 | 3 | 1 open
- LP-0019: 1 | 1 | 0 open  (LP-0019 is NOT a published prize file yet — only count
  toward a prize if prizes/LP-0019.md exists; otherwise drop)

Open solution PRs (the real under-review board), by prize:
- LP-0002: #91 jeefxM, #92 Tranquil-Flow
- LP-0003: #84 Timidan, #86 retraca
- LP-0005: #64 edenbd1, #74 dubzn, #78 Tranquil-Flow, #89 retraca
- LP-0013: #56 bristinWild, #65 edenbd1, #73 ego-errante, #77 Tranquil-Flow, #94 youthisguy
- LP-0016: #76 syafiqeil, #80 jeefxM
- LP-0017: #79 Tranquil-Flow

Reviewer signal available:
- #112 sub-issues: #129 LP-0013/bristinWild->weboko(open), #153 LP-0002/jeefxM->none(open),
  plus closed-review history.
- PR requested_reviewers: weboko on #65, #73, #77.

## 4. "Won" = a merged solution PR (mmlado x2, bristinWild) OR a file already in
solutions/ (LP-0014 team delivery has solutions/LP-0014.md but no winning PR author —
show as "delivered by team", no winner name). LP-0000 solutions file = template, ignore.

## 5. Resubmission rules unchanged: max 3 per (builder,prize); max 1/week.
Classify per (builder,prize) ordered by PR created date: attempt 1 = initial, 2+ =
resubmission. Flag attempt>3 (cap) and any gap <7d from previous (1/week).

## UI changes requested
- Overview: REMOVE the stat cards: Resubmissions, Rule flags, Builders, Reviewers.
  Keep: Total prizes, Prizes won, Submissions (+ maybe under-review count).
- "Submissions per prize" bar chart: include the prize NAME/title next to LP id.
