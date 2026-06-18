// Fetches live Lambda Prize data from GitHub and emits src/data/data.json.
// No auth needed (public repos); GITHUB_TOKEN used if present to raise rate limits.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OWNER = 'logos-co';
const PRIZE_REPO = 'lambda-prize';
const ECO_REPO = 'ecosystem';
const REVIEW_TRACKER = 112;

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const headers = {
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'lambda-prize-dashboard',
  ...(token ? { Authorization: `token ${token}` } : {}),
};

async function gh(path) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${url}: ${await res.text()}`);
  return res.json();
}

async function ghPaged(path) {
  let out = [];
  for (let page = 1; page <= 10; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const batch = await gh(`${path}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out = out.concat(batch);
    if (batch.length < 100) break;
  }
  return out;
}

function parseLp(title) {
  let m = title.match(/LP[- ]?0*(\d{1,4})/i);
  if (m) return `LP-${String(+m[1]).padStart(4, '0')}`;
  m = title.match(/(?:\u03bb)?[Pp]rize\s*0*(\d{1,4})/);
  if (m) return `LP-${String(+m[1]).padStart(4, '0')}`;
  return null;
}
const isSolution = (t) => /^\s*solution/i.test(t) || t.includes('Solution:');

function decode(b64) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

function parseReadmeStatus(md) {
  // Parse the README status table: | [LP-XXXX](..) | desc | Size | Status |
  const map = {};
  const re = /\|\s*\[?(LP-\d{4})\]?[^|]*\|([^|]*)\|([^|]*)\|([^|]*)\|/g;
  let m;
  while ((m = re.exec(md))) {
    map[m[1]] = {
      desc: m[2].trim(),
      size: m[3].trim().replace(/[^A-Za-z]/g, '') || null,
      status: m[4].trim(),
    };
  }
  return map;
}

const STATUS_TO_STAGE = (s) => {
  const x = (s || '').toLowerCase();
  if (x.includes('closed')) return 'delivered';
  if (x.includes('open')) return 'published';
  if (x.includes('draft')) return 'identified';
  return 'identified';
};

async function main() {
  console.log('Fetching prize catalog...');
  const readme = await gh(`/repos/${OWNER}/${PRIZE_REPO}/contents/README.md`);
  const readmeMd = decode(readme.content);
  const statusMap = parseReadmeStatus(readmeMd);

  // List prize md files
  const prizeDir = await gh(`/repos/${OWNER}/${PRIZE_REPO}/contents/prizes`);
  const solutionDir = await gh(`/repos/${OWNER}/${PRIZE_REPO}/contents/solutions`).catch(() => []);
  const prizeIds = prizeDir
    .filter((f) => /^LP-\d{4}\.md$/.test(f.name))
    .map((f) => f.name.replace('.md', ''))
    .filter((id) => id !== 'LP-0000') // LP-0000 is the template, not a real prize
    .sort();
  const solutionFiles = new Set(
    (Array.isArray(solutionDir) ? solutionDir : [])
      .filter((f) => /^LP-\d{4}\.md$/.test(f.name))
      .map((f) => f.name.replace('.md', '')),
  );

  console.log('Fetching PRs...');
  const prs = await ghPaged(`/repos/${OWNER}/${PRIZE_REPO}/pulls?state=all`);

  console.log('Fetching review tracker sub-issues...');
  const subIssues = await gh(`/repos/${OWNER}/${ECO_REPO}/issues/${REVIEW_TRACKER}/sub_issues?per_page=100`)
    .catch(() => []);

  const prizeIdSet = new Set(prizeIds);
  const lpFromPath = (p) => (p.match(/solutions\/(LP-\d{4})/) || [])[1] || null;

  // --- Build submissions: FILE-BASED detection ---
  // A PR is a submission iff it adds/edits >=1 solutions/LP-XXXX.md targeting exactly
  // ONE published prize, and edits at most one prizes/ file (excludes bulk template PRs).
  console.log(`Classifying ${prs.length} PRs by changed files...`);
  const solutions = [];
  for (const p of prs) {
    const files = await gh(`/repos/${OWNER}/${PRIZE_REPO}/pulls/${p.number}/files?per_page=100`)
      .catch(() => []);
    const paths = Array.isArray(files) ? files.map((f) => f.filename) : [];
    const solPaths = paths.filter((x) => /^solutions\/LP-\d{4}\.md$/.test(x));
    const prizePaths = paths.filter((x) => x.startsWith('prizes/'));
    const lps = [...new Set(solPaths.map(lpFromPath).filter(Boolean))];
    if (solPaths.length === 0) continue;        // not a submission
    if (prizePaths.length > 1) continue;        // bulk catalog/template PR
    if (lps.length !== 1) continue;             // ambiguous / multi-prize
    const lp = lps[0];
    if (lp === 'LP-0000') continue;             // template
    if (!prizeIdSet.has(lp)) continue;          // prize not published (e.g. LP-0019)
    solutions.push({
      num: p.number,
      lp,
      user: p.user.login,
      title: p.title,
      state: p.state,
      merged: !!p.merged_at,
      draft: !!p.draft,
      created: p.created_at,
      mergedAt: p.merged_at,
      url: p.html_url,
    });
  }
  console.log(`Found ${solutions.length} submissions.`);

  // Group by builder x prize -> classify initial/resubmission + violations
  const groups = {};
  for (const s of solutions) {
    const key = `${s.user}::${s.lp}`;
    (groups[key] ||= []).push(s);
  }
  const submissions = [];
  for (const key of Object.keys(groups)) {
    const items = groups[key].sort((a, b) => a.created.localeCompare(b.created));
    const n = items.length;
    items.forEach((s, i) => {
      const violations = [];
      if (i + 1 > 3) violations.push('Exceeds 3-submission cap');
      if (i > 0) {
        const prev = new Date(items[i - 1].created);
        const days = (new Date(s.created) - prev) / 86400000;
        if (days < 7) {
          violations.push(`Only ${Math.floor(days)}d after prev submission (1/week rule)`);
        }
      }
      submissions.push({
        ...s,
        attempt: i + 1,
        totalAttempts: n,
        kind: i === 0 ? 'initial' : 'resubmission',
        violations,
      });
    });
  }

  // --- Under review (from sub-issues) ---
  // --- Sub-issues are ENRICHMENT only (reviewer + discord link), not the state source. ---
  const subInfo = (Array.isArray(subIssues) ? subIssues : []).map((i) => {
    const body = i.body || '';
    const disc = (body.match(/https:\/\/discord\.com\/channels\/[^\s)\]]+/) || [])[0] || null;
    const lp = parseLp(i.title);
    // builder = trailing token after the last em-dash (U+2014); keep hyphenated usernames intact.
    const parts = i.title.split(/\u2014/).map((x) => x.trim()).filter(Boolean);
    const builder = parts.length > 1 ? parts[parts.length - 1] : null;
    return {
      issue: i.number,
      lp,
      builder,
      reviewer: (i.assignees || []).map((a) => a.login)[0] || null,
      state: i.state,
      discord: disc,
      url: i.html_url,
    };
  });
  const findSub = (lp, builder) =>
    subInfo.find((s) => s.lp === lp && s.builder && builder &&
      s.builder.toLowerCase() === builder.toLowerCase()) ||
    subInfo.find((s) => s.lp === lp);

  // --- Under Review board: SOURCE OF TRUTH = open solution PRs. ---
  // Fetch requested_reviewers per open PR; fall back to matching sub-issue reviewer.
  const openSubs = solutions.filter((s) => s.state === 'open');
  const review = [];
  for (const s of openSubs) {
    const full = await gh(`/repos/${OWNER}/${PRIZE_REPO}/pulls/${s.num}`).catch(() => ({}));
    const reqReviewers = (full.requested_reviewers || []).map((u) => u.login);
    const sub = findSub(s.lp, s.user);
    const reviewer = reqReviewers[0] || (sub && sub.reviewer) || null;
    review.push({
      lp: s.lp,
      pr: s.num,
      builder: s.user,
      created: s.created,
      reviewer,
      reviewers: reqReviewers,
      draft: s.draft,
      discord: sub ? sub.discord : null,
      reviewIssue: sub ? sub.url : null,
      url: s.url,
    });
  }

  // --- Prize catalog ---
  const prizes = prizeIds.map((id) => {
    const meta = statusMap[id] || {};
    const subs = submissions.filter((s) => s.lp === id);
    const builders = new Set(subs.map((s) => s.user));
    const merged = solutions.find((s) => s.lp === id && s.merged);
    const openCount = subs.filter((s) => s.state === 'open').length;
    const acceptedCount = subs.filter((s) => s.merged).length;
    const rejectedCount = subs.filter((s) => s.state !== 'open' && !s.merged).length;
    const hasSol = solutionFiles.has(id);
    return {
      id,
      desc: meta.desc || '',
      size: meta.size || null,
      status: meta.status || 'Unknown',
      stage: STATUS_TO_STAGE(meta.status),
      hasSolutionFile: hasSol,
      won: !!merged || hasSol,
      winner: merged ? merged.user : null,
      deliveredByTeam: !merged && hasSol,
      openSubmissions: openCount,
      acceptedSubmissions: acceptedCount,
      rejectedSubmissions: rejectedCount,
      submissionCount: subs.length,
      builderCount: builders.size,
      specUrl: `https://github.com/${OWNER}/${PRIZE_REPO}/blob/master/prizes/${id}.md`,
      solutionUrl: solutionFiles.has(id)
        ? `https://github.com/${OWNER}/${PRIZE_REPO}/blob/master/solutions/${id}.md`
        : null,
    };
  });

  // --- Aggregate stats ---
  const allBuilders = new Set(submissions.map((s) => s.user));
  const allReviewers = new Set(review.map((r) => r.reviewer).filter(Boolean));
  const wonPrizes = prizes.filter((p) => p.won);
  const stats = {
    totalPrizes: prizes.length,
    open: prizes.filter((p) => /open/i.test(p.status)).length,
    draft: prizes.filter((p) => /draft/i.test(p.status)).length,
    closed: prizes.filter((p) => /closed/i.test(p.status)).length,
    totalSubmissions: submissions.length,
    distinctSubmissions: Object.keys(groups).length,
    underReview: review.length,
    resubmissions: submissions.filter((s) => s.kind === 'resubmission').length,
    violations: submissions.filter((s) => s.violations.length).length,
    prizesWon: wonPrizes.length,
    uniqueBuilders: allBuilders.size,
    activeReviewers: allReviewers.size,
  };

  const data = {
    generatedAt: new Date().toISOString(),
    sources: {
      prizes: `https://github.com/${OWNER}/${PRIZE_REPO}`,
      reviewTracker: `https://github.com/${OWNER}/${ECO_REPO}/issues/${REVIEW_TRACKER}`,
    },
    stats,
    prizes,
    submissions: submissions.sort((a, b) => (a.lp || '').localeCompare(b.lp || '') || a.created.localeCompare(b.created)),
    review: review.sort((a, b) => (a.lp || '').localeCompare(b.lp || '') || a.created.localeCompare(b.created)),
  };

  mkdirSync(join(ROOT, 'src', 'data'), { recursive: true });
  writeFileSync(join(ROOT, 'src', 'data', 'data.json'), JSON.stringify(data, null, 2));
  console.log('Wrote src/data/data.json');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
