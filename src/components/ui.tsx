import type { ReactNode, CSSProperties } from 'react';
import { INK, PAPER, MUTED, GRID, LP_STAGES, LP_STAGE_COLOR, SIZE_COLOR, SIZE_NORM, OK_GREEN, WARN_RED, WARN_AMBER } from '../styles/tokens';

export function GridBg() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: [
        `linear-gradient(${GRID} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${GRID} 1px, transparent 1px)`,
        `linear-gradient(rgba(26,26,26,0.04) 1px, transparent 1px)`,
        `linear-gradient(90deg, rgba(26,26,26,0.04) 1px, transparent 1px)`,
      ].join(','),
      backgroundSize: '24px 24px, 24px 24px, 120px 120px, 120px 120px',
    }} />
  );
}

type TickPos = 'tl' | 'tr' | 'bl' | 'br';
export function Tick({ pos }: { pos: TickPos }) {
  const s = 10;
  const v = ({
    tl: { top: 8, left: 8 }, tr: { top: 8, right: 8 },
    bl: { bottom: 8, left: 8 }, br: { bottom: 8, right: 8 },
  } satisfies Record<TickPos, CSSProperties>)[pos];
  const flipH = pos === 'tr' || pos === 'br';
  const flipV = pos === 'bl' || pos === 'br';
  return (
    <svg width={s} height={s} viewBox="0 0 10 10" style={{ position: 'absolute', ...v, transform: `scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})` }}>
      <path d="M0 0 L10 0 M0 0 L0 10" stroke={INK} strokeWidth="1" fill="none" />
    </svg>
  );
}

// L-Prize diamond glyph.
export function LambdaDiamond({ size = 11, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size + 2} height={size} viewBox="0 0 12 10" style={{ display: 'block' }}>
      <polygon points="3,1 11,1 9,9 1,9" fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

export function Pill({ children, color, fill = 'transparent', title }: { children: ReactNode; color: string; fill?: string; title?: string }) {
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 6px', border: `1px solid ${color}`, color, background: fill,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      lineHeight: 1.3, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

export function SizePill({ value }: { value: string | null }) {
  if (!value) return null;
  const norm = SIZE_NORM[value] || value;
  const c = SIZE_COLOR[norm] || MUTED;
  return <Pill color={c} title={`Effort: ${value}`}>{norm}</Pill>;
}

export function StatusStageTracker({ stage, showLabel = true }: { stage: string; showLabel?: boolean }) {
  const stages = LP_STAGES;
  const s = stages.find((x) => x.id === stage) || stages[0];
  const dotR = 4, gap = 7;
  const stepColor = LP_STAGE_COLOR[stage] || MUTED;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width={stages.length * (dotR * 2 + gap) - gap} height={dotR * 2 + 4} style={{ display: 'block', overflow: 'visible' }}>
        {stages.map((stg, i) => {
          const cx = dotR + i * (dotR * 2 + gap), cy = dotR + 2;
          const filled = stg.step <= s.step, current = stg.step === s.step;
          return (
            <g key={stg.id}>
              {current && <circle cx={cx} cy={cy} r={dotR + 1.5} fill="none" stroke={stepColor} strokeWidth="1" />}
              <circle cx={cx} cy={cy} r={dotR} fill={filled ? stepColor : 'transparent'} stroke={stepColor} strokeWidth="1" />
            </g>
          );
        })}
      </svg>
      {showLabel && <span style={{ fontSize: 10, color: stepColor, fontWeight: 600, letterSpacing: '0.04em' }}>{s.label}</span>}
    </div>
  );
}

export function extlink(href: string, label: ReactNode, color = INK) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px',
      border: `1px solid ${color}`, color, fontSize: 10, letterSpacing: '0.04em',
      textDecoration: 'none', background: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap',
    }}>{label}</a>
  );
}

export function KindPip({ kind }: { kind: 'initial' | 'resubmission' }) {
  const initial = kind === 'initial';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 5px',
      border: `1px solid ${initial ? MUTED : WARN_AMBER}`, color: initial ? MUTED : WARN_AMBER,
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>{initial ? 'Initial' : 'Resubmit'}</span>
  );
}

export function ViolationPip({ violations }: { violations: string[] }) {
  if (!violations.length) return null;
  return (
    <span title={violations.join('\n')} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '1px 5px', background: WARN_RED, color: '#fff',
      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
    }}>! RULE</span>
  );
}
