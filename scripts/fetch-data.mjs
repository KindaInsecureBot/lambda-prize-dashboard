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

  // --- Build submissions (solution PRs) ---
  const solutions = prs
    .filter((p) => isSolution(p.title))
    .map((p) => ({
      num: p.number,
      lp: parseLp(p.title),
      user: p.user.login,
      title: p.title,
      state: p.state,
      merged: !!p.merged_at,
      created: p.created_at,
      mergedAt: p.merged_at,
      url: p.html_url,
    }))
    .filter((s) => s.lp);

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
  const reReviewer = /\[L-Prize Submission Review\]\s*(LP[- ]?\d+|LP\d+)\s*[\u2014-]\s*(.+?)\s*[\u2014-]\s*(.+)$/;
  const review = (Array.isArray(subIssues) ? subIssues : []).map((i) => {
    const body = i.body || '';
    const disc = (body.match(/https:\/\/discord\.com\/channels\/[^\s)\]]+/) || [])[0] || null;
    const lp = parseLp(i.title);
    // builder name is the trailing token after the last em-dash (U+2014).
    // Split on em-dash ONLY so hyphenated usernames (e.g. Tranquil-Flow) survive.
    const parts = i.title.split(/\u2014/).map((x) => x.trim()).filter(Boolean);
    const builder = parts.length > 1 ? parts[parts.length - 1] : null;
    return {
      issue: i.number,
      lp,
      title: i.title,
      builder,
      reviewer: (i.assignees || []).map((a) => a.login)[0] || null,
      reviewers: (i.assignees || []).map((a) => a.login),
      state: i.state,
      discord: disc,
      url: i.html_url,
    };
  });

  // --- Prize catalog ---
  const prizes = prizeIds.map((id) => {
    const meta = statusMap[id] || {};
    const subs = submissions.filter((s) => s.lp === id);
    const builders = new Set(subs.map((s) => s.user));
    const merged = solutions.find((s) => s.lp === id && s.merged);
    return {
      id,
      desc: meta.desc || '',
      size: meta.size || null,
      status: meta.status || 'Unknown',
      stage: STATUS_TO_STAGE(meta.status),
      hasSolutionFile: solutionFiles.has(id),
      won: !!merged || solutionFiles.has(id),
      winner: merged ? merged.user : null,
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
  const allReviewers = new Set(review.flatMap((r) => r.reviewers));
  const wonPrizes = prizes.filter((p) => p.won);
  const stats = {
    totalPrizes: prizes.length,
    open: prizes.filter((p) => /open/i.test(p.status)).length,
    draft: prizes.filter((p) => /draft/i.test(p.status)).length,
    closed: prizes.filter((p) => /closed/i.test(p.status)).length,
    totalSubmissions: submissions.length,
    distinctSubmissions: Object.keys(groups).length,
    resubmissions: submissions.filter((s) => s.kind === 'resubmission').length,
    violations: submissions.filter((s) => s.violations.length).length,
    prizesWon: wonPrizes.length,
    uniqueBuilders: allBuilders.size,
    activeReviewers: allReviewers.size,
    openReviews: review.filter((r) => r.state === 'open').length,
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
    review: review.sort((a, b) => (b.state === 'open' ? 1 : 0) - (a.state === 'open' ? 1 : 0) || (a.lp || '').localeCompare(b.lp || '')),
  };

  mkdirSync(join(ROOT, 'src', 'data'), { recursive: true });
  writeFileSync(join(ROOT, 'src', 'data', 'data.json'), JSON.stringify(data, null, 2));
  console.log('Wrote src/data/data.json');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
