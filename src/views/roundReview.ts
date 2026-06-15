import { el, escapeHtml, qs } from '../dom';
import { getState, go, editRound, removeRound } from '../store';
import { sgBarsHTML } from '../components/sgBars';
import { reviewRec, missPatternCaption, supportingMetrics } from '../lib/copy';
import type { MissCell, Round } from '../lib/sg/types';
import { fmtDate } from '../util';

// Heat grid order, top-left to bottom-right.
const HEAT_ORDER: MissCell[] = ['LL', 'L', 'LR', 'left', 'green', 'right', 'SL', 'S', 'SR'];

export function RoundReviewView(id: string): HTMLElement {
  const { rounds } = getState();
  const round = rounds.find((r) => r.id === id);
  const page = el('section', { class: 'page on', id: 'review' });

  if (!round) {
    page.innerHTML = `<p class="emptystate" style="padding:20px">Round not found.</p>
      <button class="ghost block" id="back">Back</button>`;
    qs('#back', page)!.addEventListener('click', () => go({ name: 'rounds' }));
    return page;
  }

  const score = round.stats.vsPar + round.coursePar;
  const vsPar = round.stats.vsPar;
  const rec = reviewRec(round.biggestLeak, round.sg[round.biggestLeak], supportingMetrics([round]));

  page.innerHTML = `
    <div class="holehead">
      <div><div class="eyebrow">${escapeHtml(round.courseName)}</div><div class="h" style="margin-top:2px">Round review</div></div>
      <button class="ghost" id="done" style="padding:5px 10px;font-size:12px">Done</button>
    </div>

    <div class="card read">
      <div class="summ">
        <div class="it"><div class="l">Score</div><div class="v mono">${score}</div></div>
        <div class="it"><div class="l">vs par</div><div class="v mono">${vsPar >= 0 ? '+' : ''}${vsPar}</div></div>
        <div class="it"><div class="l">Putts</div><div class="v mono">${round.stats.putts}</div></div>
        <div class="it"><div class="l">GIR</div><div class="v mono">${round.stats.girPct}%</div></div>
        <div class="it"><div class="l">Fairways</div><div class="v mono">${round.stats.firPct}%</div></div>
        <div class="it"><div class="l">Penalties</div><div class="v mono">${round.stats.penalties}</div></div>
      </div>
      <p style="font-size:11.5px;color:var(--ink-dim);margin:12px 0 0;text-align:center">${fmtDate(round.date)} · ${escapeHtml(round.tee)}${round.complete ? '' : ' · partial round (excluded from trends)'}</p>
    </div>

    <div class="card">
      <h2>Strokes gained · this round</h2>
      ${sgBarsHTML(round.sg)}
    </div>

    <div class="card">
      <h2>Miss pattern</h2>
      <div class="heat">${heatHTML(round)}</div>
      <p style="font-size:12.5px;color:var(--ink-dim);text-align:center;margin:12px 0 0">${escapeHtml(missPatternCaption(round.holes))}</p>
    </div>

    <div class="card">
      <h2><span class="num red">→</span> Practice this next</h2>
      <div class="verdict leak"><b>${escapeHtml(rec.headline)}</b> <span class="dim">${escapeHtml(rec.detail)}</span></div>
    </div>

    <div class="btnrow">
      <button class="ghost" id="edit">Edit round</button>
      <button class="danger" id="delete">Delete</button>
    </div>
    <div class="spacer"></div>`;

  qs('#done', page)!.addEventListener('click', () => go({ name: 'home' }));
  qs('#edit', page)!.addEventListener('click', () => {
    editRound(round);
    go({ name: 'hole' });
  });
  qs('#delete', page)!.addEventListener('click', async () => {
    if (!confirm('Delete this round? This cannot be undone.')) return;
    await removeRound(round.id);
    go({ name: 'rounds' });
  });

  return page;
}

function heatHTML(round: Round): string {
  const counts = new Map<MissCell, number>();
  let greens = 0;
  for (const h of round.holes) {
    if (h.gir) greens++;
    else counts.set(h.missCell, (counts.get(h.missCell) ?? 0) + 1);
  }
  const max = Math.max(1, ...Array.from(counts.values()));
  return HEAT_ORDER.map((cell) => {
    if (cell === 'green') {
      return `<div class="c">${greens || '●'}</div>`;
    }
    const c = counts.get(cell) ?? 0;
    const op = c === 0 ? 0.12 : 0.2 + 0.8 * (c / max);
    return `<div style="background:rgba(224,106,92,${op.toFixed(2)})">${c || ''}</div>`;
  }).join('');
}
