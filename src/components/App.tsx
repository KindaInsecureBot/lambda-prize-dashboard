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

const SCREENS = ['Overview', 'Under Review', 'Catalog', 'Submissions'] as const;
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
        {screen === 'Submissions' && <Submissions data={data} />}
      </div>
    </div>
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
  const byCount = [...data.prizes].filter((p) => p.submissionCount > 0).sort((a, b) => b.submissionCount - a.submissionCount);
  const max = Math.max(1, ...byCount.map((p) => p.submissionCount));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <Stat label="Total prizes" value={s.totalPrizes} sub={`${s.open} open · ${s.draft} draft · ${s.closed} closed`} />
        <Stat label="Prizes won" value={s.prizesWon} color={OK_GREEN} sub="merged solutions" />
        <Stat label="Submissions" value={s.totalSubmissions} sub={`${s.distinctSubmissions} distinct builder×prize`} />
        <Stat label="Resubmissions" value={s.resubmissions} sub={`of ${s.totalSubmissions} total`} />
        <Stat label="Rule flags" value={s.violations} color={s.violations ? WARN_RED : INK} sub="cap / 1-per-week" />
        <Stat label="Builders" value={s.uniqueBuilders} />
        <Stat label="Reviewers" value={s.activeReviewers} sub={`${s.openReviews} open reviews`} />
      </div>

      <SectionTitle>Submissions per prize</SectionTitle>
      <div style={{ border: `1px solid ${SUBTLE}`, background: PANEL, padding: '14px 16px' }}>
        {byCount.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <span style={{ width: 70, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{p.id}</span>
            <div style={{ flex: 1, background: 'rgba(26,26,26,0.05)', height: 16, position: 'relative' }}>
              <div style={{ width: `${(p.submissionCount / max) * 100}%`, height: '100%', background: LPRIZE_TINT, borderRight: `2px solid ${LPRIZE}` }} />
            </div>
            <span style={{ width: 90, fontSize: 10, color: MUTED, textAlign: 'right', flexShrink: 0 }}>
              {p.submissionCount} sub · {p.builderCount} bldr
            </span>
          </div>
        ))}
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

function UnderReview({ data }: { data: Data }) {
  const open = data.review.filter((r) => r.state === 'open');
  const closed = data.review.filter((r) => r.state !== 'open');
  const render = (r: any) => (
    <Card key={r.issue} accent={r.state === 'open' ? LPRIZE_BORDER : SUBTLE}>
      <Row>
        <LambdaDiamond size={11} color={LPRIZE} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{r.lp || '—'}</span>
        <Pill color={r.state === 'open' ? LPRIZE : OK_GREEN} fill={r.state === 'open' ? LPRIZE_TINT : 'transparent'}>
          {r.state === 'open' ? 'In review' : 'Reviewed'}
        </Pill>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: MUTED }}>#{r.issue}</span>
      </Row>
      <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 11 }}>
        <div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Builder</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{r.builder || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reviewer</div>
          <div style={{ fontWeight: 600, marginTop: 2, color: r.reviewer ? INK : WARN_RED }}>{r.reviewer || 'UNASSIGNED'}</div>
        </div>
      </div>
      <Row gap={6}>
        <div style={{ marginTop: 8 }} />
      </Row>
      <Row gap={6}>
        {extlink(r.url, 'review issue', INK)}
        {r.discord && extlink(r.discord, 'discord thread', '#5865F2')}
      </Row>
    </Card>
  );
  return (
    <div>
      <SectionTitle>Open reviews ({open.length})</SectionTitle>
      {open.length ? open.map(render) : <Empty>Nothing awaiting review.</Empty>}
      <SectionTitle>Completed reviews ({closed.length})</SectionTitle>
      {closed.map(render)}
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
              {p.won && <span style={{ color: OK_GREEN, fontWeight: 700 }}>{p.winner ? ` · won by ${p.winner}` : ' · delivered'}</span>}
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
