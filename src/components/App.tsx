import { useState, useMemo } from 'react';
import {
  INK, PAPER, PANEL, MUTED, SUBTLE, LPRIZE, LPRIZE_TINT, LPRIZE_BORDER,
  STATUS_COLOR, STATUS_FILL, OK_GREEN, WARN_RED,
} from '../styles/tokens';
import {
  GridBg, Tick, LambdaDiamond, Pill, SizePill, StatusStageTracker,
  extlink, KindPip, ViolationPip,
} from './ui';

type Data = {
  generatedAt: string;
  sources: { prizes: string; reviewTracker: string };
  stats: Record<string, number>;
  prizes: any[];
  submissions: any[];
  review: any[];
};

const SCREENS = ['Overview', 'Under Review', 'Catalog'] as const;
type Screen = typeof SCREENS[number];

export default function App({ data }: { data: Data }) {
  const [screen, setScreen] = useState<Screen>('Overview');
  const gen = new Date(data.generatedAt);

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: PAPER, color: INK, overflow: 'hidden',
      border: `1px solid ${INK}`,
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    }}>
      <GridBg />
      <Tick pos="tl" /><Tick pos="tr" /><Tick pos="bl" /><Tick pos="br" />

      {/* nav chrome */}
      <div style={{ position: 'absolute', top: 18, left: 24, zIndex: 6, display: 'flex', gap: 6 }}>
        {SCREENS.map((s) => (
          <button key={s} onClick={() => setScreen(s)} style={{
            cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit',
            fontSize: 11, letterSpacing: '0.04em',
            border: `1px solid ${screen === s ? INK : SUBTLE}`,
            background: screen === s ? INK : PANEL,
            color: screen === s ? PAPER : MUTED, fontWeight: 600,
          }}>{s}</button>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 22, right: 24, zIndex: 6, fontSize: 10, color: MUTED, letterSpacing: '0.06em', textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LambdaDiamond size={11} color={LPRIZE} /> <span style={{ color: LPRIZE, fontWeight: 700 }}>λPRIZE</span>
        </div>
        <div style={{ marginTop: 2 }}>updated {gen.toISOString().slice(0, 16).replace('T', ' ')}Z</div>
      </div>

      {/* title row */}
      <div style={{
        position: 'absolute', top: 54, left: 24, right: 24,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        borderBottom: `1px solid ${INK}`, paddingBottom: 8, gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Lambda Prize Dashboard</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
            Competitive prizes for building on the Logos stack · live from GitHub
          </div>
        </div>
        <div style={{ fontSize: 10, color: MUTED, textAlign: 'right', letterSpacing: '0.06em' }}>
          {data.stats.totalPrizes} PRIZES · {data.stats.totalSubmissions} SUBMISSIONS · {data.stats.uniqueBuilders} BUILDERS
        </div>
      </div>

      {/* scroll body */}
      <div style={{ position: 'absolute', top: 100, left: 24, right: 24, bottom: 24, overflowY: 'auto', paddingRight: 6 }}>
        {screen === 'Overview' && <Overview data={data} onJump={setScreen} />}
        {screen === 'Under Review' && <UnderReview data={data} />}
        {screen === 'Catalog' && <Catalog data={data} />}
      </div>
    </div>
  );
}

const SPEC_URL = (lp: string) => `https://github.com/logos-co/lambda-prize/blob/master/prizes/${lp}.md`;

function daysAgo(iso?: string) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

function SpecLink({ lp, desc, color = INK, bold }: { lp: string; desc?: string; color?: string; bold?: boolean }) {
  return (
    <a href={SPEC_URL(lp)} target="_blank" rel="noreferrer noopener"
      style={{ color, textDecoration: 'none', borderBottom: `1px dotted ${color}` }}>
      <span style={{ fontWeight: 700 }}>{lp}</span>
      {desc ? <span style={{ fontWeight: bold ? 700 : 400, color: bold ? color : MUTED }}> · {desc}</span> : null}
    </a>
  );
}

function Legend({ color, label, active = true, onClick }: { color: string; label: string; active?: boolean; onClick?: () => void }) {
  const clickable = !!onClick;
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        cursor: clickable ? 'pointer' : 'default',
        opacity: active ? 1 : 0.4,
        userSelect: 'none',
        textDecoration: active ? 'none' : 'line-through',
      }}
    >
      <span style={{ width: 10, height: 10, background: color, display: 'inline-block',
        outline: active ? 'none' : `1px solid ${color}`, outlineOffset: 1,
        ...(active ? {} : { background: 'transparent' }) }} />
      {label}
    </span>
  );
}

function Stat({ label, value, sub, color = INK }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{ border: `1px solid ${SUBTLE}`, background: PANEL, padding: '12px 14px', minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10, color: MUTED, marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Overview({ data, onJump }: { data: Data; onJump: (s: Screen) => void }) {
  const s = data.stats;
  const [show, setShow] = useState({ pending: true, accepted: true, rejected: true });
  const toggle = (k: keyof typeof show) => setShow((v) => ({ ...v, [k]: !v[k] }));
  const visCount = (p: any) =>
    (show.pending ? p.openSubmissions : 0) +
    (show.accepted ? p.acceptedSubmissions : 0) +
    (show.rejected ? p.rejectedSubmissions : 0);
  const byCount = [...data.prizes]
    .filter((p) => visCount(p) > 0)
    .sort((a, b) => visCount(b) - visCount(a));
  const max = Math.max(1, ...byCount.map((p) => visCount(p)));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <Stat label="Total prizes" value={s.totalPrizes} sub={`${s.open} open · ${s.draft} draft · ${s.closed} closed`} />
        <Stat label="Prizes won" value={s.prizesWon} color={OK_GREEN} sub="delivered" />
        <Stat label="Submissions" value={s.totalSubmissions} sub={`${s.distinctSubmissions} distinct builder×prize`} />
        <Stat label="Under review" value={s.underReview} color={LPRIZE} sub="open submission PRs" />
        <Stat label="Builders engaged" value={s.uniqueBuilders} sub="unique submitters" />
      </div>

      <SectionTitle>Submissions per prize</SectionTitle>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 10, color: MUTED, margin: '0 0 8px 2px' }}>
        <Legend color={LPRIZE} label="Pending review" active={show.pending} onClick={() => toggle('pending')} />
        <Legend color={OK_GREEN} label="Accepted (won)" active={show.accepted} onClick={() => toggle('accepted')} />
        <Legend color={WARN_RED} label="Rejected / closed" active={show.rejected} onClick={() => toggle('rejected')} />
        <span style={{ color: SUBTLE }}>(click to filter)</span>
      </div>
      <div style={{ border: `1px solid ${SUBTLE}`, background: PANEL, padding: '14px 16px' }}>
        {byCount.map((p) => {
          const seg = (n: number, color: string) =>
            n > 0 ? <div title={`${n}`} style={{ width: `${(n / max) * 100}%`, height: '100%', background: color }} /> : null;
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <span style={{ width: 200, fontSize: 11, flexShrink: 0, lineHeight: 1.2 }}>
                <SpecLink lp={p.id} desc={p.desc} />
              </span>
              <div style={{ flex: 1, background: 'rgba(26,26,26,0.05)', height: 16, display: 'flex' }}>
                {show.pending && seg(p.openSubmissions, LPRIZE)}
                {show.accepted && seg(p.acceptedSubmissions, OK_GREEN)}
                {show.rejected && seg(p.rejectedSubmissions, WARN_RED)}
              </div>
              <span style={{ width: 116, fontSize: 10, color: MUTED, textAlign: 'right', flexShrink: 0 }}>
                {visCount(p)} shown
                {show.pending && p.openSubmissions ? ` · ${p.openSubmissions} pending` : ''}
              </span>
            </div>
          );
        })}
      </div>

      <SectionTitle>About</SectionTitle>
      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
        Prizes are first-come-first-served: the first submission meeting all success criteria wins.
        Each builder may submit at most 3 times per prize, with at most one submission per week.
        Data is pulled live from{' '}
        <a href={data.sources.prizes} target="_blank" rel="noreferrer" style={{ color: LPRIZE }}>logos-co/lambda-prize</a>{' '}
        and the{' '}
        <a href={data.sources.reviewTracker} target="_blank" rel="noreferrer" style={{ color: LPRIZE }}>review tracker</a>.
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: any }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK, margin: '22px 0 10px' }}>{children}</div>;
}

function Card({ children, accent = SUBTLE }: { children: any; accent?: string }) {
  return (
    <div style={{ border: `1px solid ${accent}`, background: PANEL, padding: '12px 14px', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Row({ children, gap = 8 }: { children: any; gap?: number }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap, flexWrap: 'wrap' }}>{children}</div>;
}

function ReviewCard({ r, queued }: { r: any; queued?: boolean }) {
  return (
    <Card accent={queued ? SUBTLE : LPRIZE_BORDER}>
      <Row>
        <LambdaDiamond size={11} color={LPRIZE} />
        <span style={{ fontSize: 13 }}><SpecLink lp={r.lp} /></span>
        <Pill color={queued ? MUTED : LPRIZE} fill={queued ? 'transparent' : LPRIZE_TINT}>
          {queued ? 'In line' : r.draft ? 'Draft PR' : 'In review'}
        </Pill>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: MUTED }}>PR #{r.pr}</span>
      </Row>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: 16, marginTop: 8, fontSize: 11 }}>
        <div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Builder</div>
          <div style={{ fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.builder || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reviewer</div>
          <div style={{ fontWeight: 600, marginTop: 2, color: r.reviewer ? INK : WARN_RED, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reviewer || 'UNASSIGNED'}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Submitted</div>
          <div style={{ fontWeight: 600, marginTop: 2 }} title={r.created ? r.created.slice(0, 10) : ''}>{daysAgo(r.created)}</div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <Row gap={6}>
          {extlink(r.url, `PR #${r.pr}`, INK)}
          {r.reviewIssue && extlink(r.reviewIssue, 'review issue', INK)}
          {r.discord && extlink(r.discord, 'discord thread', '#5865F2')}
        </Row>
      </div>
    </Card>
  );
}

function PrizeReviewGroup({ lp, items }: { lp: string; items: any[] }) {
  // items are pre-sorted oldest-first; the oldest is the one actually under review.
  const [open, setOpen] = useState(false);
  const [head, ...queue] = items;
  return (
    <div style={{ marginBottom: 14 }}>
      <ReviewCard r={head} />
      {queue.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              cursor: 'pointer', background: 'transparent', border: `1px solid ${SUBTLE}`,
              color: MUTED, font: 'inherit', fontSize: 11, padding: '4px 10px', width: '100%',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ transition: 'transform .15s', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
            {queue.length} more in line for {lp}
          </button>
          {open && (
            <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: `2px solid ${SUBTLE}` }}>
              {queue.map((r) => <ReviewCard key={r.pr} r={r} queued />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UnderReview({ data }: { data: Data }) {
  // Source of truth: every open solution PR is "under review".
  // Per prize, show only the oldest (the one actually being reviewed); the rest queue behind a dropdown.
  const byPrize: Record<string, any[]> = {};
  for (const r of data.review) (byPrize[r.lp] ||= []).push(r);
  const lps = Object.keys(byPrize).sort();
  for (const lp of lps) byPrize[lp].sort((a, b) => (a.created || '').localeCompare(b.created || ''));
  return (
    <div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
        {data.review.length} open submission{data.review.length === 1 ? '' : 's'} awaiting review,
        across {lps.length} prize{lps.length === 1 ? '' : 's'}. Showing the oldest in review per prize; expand to see the queue.
      </div>
      {lps.length === 0 && <Empty>Nothing awaiting review.</Empty>}
      {lps.map((lp) => <PrizeReviewGroup key={lp} lp={lp} items={byPrize[lp]} />)}
    </div>
  );
}

function Catalog({ data }: { data: Data }) {
  const order = (st: string) => (/open/i.test(st) ? 0 : /draft/i.test(st) ? 1 : 2);
  const prizes = [...data.prizes].sort((a, b) => order(a.status) - order(b.status) || a.id.localeCompare(b.id));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
      {prizes.map((p) => {
        const key = (/open/i.test(p.status) ? 'open' : /draft/i.test(p.status) ? 'draft' : /closed/i.test(p.status) ? 'closed' : 'unknown');
        return (
          <div key={p.id} style={{ border: `1px solid ${p.won ? OK_GREEN : SUBTLE}`, background: PANEL, padding: '12px 14px' }}>
            <Row>
              <LambdaDiamond size={11} color={LPRIZE} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{p.id}</span>
              <span style={{ flex: 1 }} />
              <SizePill value={p.size} />
              <Pill color={STATUS_COLOR[key]} fill={STATUS_FILL[key]}>{p.status}</Pill>
            </Row>
            <div style={{ fontSize: 12, fontWeight: 600, margin: '8px 0 6px', lineHeight: 1.35 }}>{p.desc}</div>
            <StatusStageTracker stage={p.stage} />
            <div style={{ fontSize: 10, color: MUTED, margin: '8px 0' }}>
              {p.submissionCount} submission{p.submissionCount === 1 ? '' : 's'} · {p.builderCount} builder{p.builderCount === 1 ? '' : 's'}
              {p.won && <span style={{ color: OK_GREEN, fontWeight: 700 }}>{p.winner ? ` · won by ${p.winner}` : ' · delivered by team'}</span>}
            </div>
            <Row gap={6}>
              {extlink(p.specUrl, 'spec', INK)}
              {p.solutionUrl && extlink(p.solutionUrl, 'solution', OK_GREEN)}
            </Row>
          </div>
        );
      })}
    </div>
  );
}

function Submissions({ data }: { data: Data }) {
  const [onlyFlags, setOnlyFlags] = useState(false);
  const groups = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const s of data.submissions) (m[s.lp] ||= []).push(s);
    return m;
  }, [data]);
  const lps = Object.keys(groups).sort();
  return (
    <div>
      <Row>
        <button onClick={() => setOnlyFlags(!onlyFlags)} style={{
          cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit', fontSize: 10,
          border: `1px solid ${onlyFlags ? WARN_RED : SUBTLE}`, background: onlyFlags ? WARN_RED : PANEL,
          color: onlyFlags ? '#fff' : MUTED, fontWeight: 600, letterSpacing: '0.06em',
        }}>{onlyFlags ? 'SHOWING RULE FLAGS ONLY' : 'SHOW RULE FLAGS ONLY'}</button>
        <span style={{ fontSize: 10, color: MUTED }}>
          {data.stats.totalSubmissions} submissions · {data.stats.resubmissions} resubmissions · {data.stats.violations} flagged
        </span>
      </Row>
      {lps.map((lp) => {
        let items = groups[lp];
        if (onlyFlags) items = items.filter((s) => s.violations.length);
        if (!items.length) return null;
        return (
          <div key={lp}>
            <SectionTitle>{lp}</SectionTitle>
            {items.map((s) => (
              <Card key={s.num} accent={s.violations.length ? WARN_RED : SUBTLE}>
                <Row>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{s.user}</span>
                  <KindPip kind={s.kind} />
                  <span style={{ fontSize: 10, color: MUTED }}>attempt {s.attempt}/{s.totalAttempts}</span>
                  <ViolationPip violations={s.violations} />
                  <span style={{ flex: 1 }} />
                  <Pill color={s.merged ? OK_GREEN : s.state === 'open' ? LPRIZE : MUTED}>
                    {s.merged ? 'merged' : s.state}
                  </Pill>
                </Row>
                <div style={{ fontSize: 10, color: MUTED, margin: '6px 0' }}>
                  {new Date(s.created).toISOString().slice(0, 10)} · PR #{s.num}
                </div>
                {s.violations.length > 0 && (
                  <div style={{ fontSize: 10, color: WARN_RED, marginBottom: 6 }}>
                    {s.violations.map((v: string, i: number) => <div key={i}>⚠ {v}</div>)}
                  </div>
                )}
                <Row gap={6}>{extlink(s.url, `PR #${s.num}`, INK)}</Row>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Empty({ children }: { children: any }) {
  return <div style={{ fontSize: 11, color: MUTED, fontStyle: 'italic', padding: '8px 0' }}>{children}</div>;
}
