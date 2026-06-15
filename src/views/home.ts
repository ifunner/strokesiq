import { el, escapeHtml } from '../dom';
import { getState, go } from '../store';
import { scoringPotential, rollingCategorySG } from '../lib/sg/engine';
import { CATEGORY_LABELS } from '../lib/sg/types';
import { sgBarsHTML } from '../components/sgBars';
import { leakCopy, gatingCopy, supportingMetrics } from '../lib/copy';
import { fmtDate } from '../util';

const LEAK_GATE = 3;

export function HomeView(): HTMLElement {
  const { rounds } = getState();
  const counting = rounds.filter((r) => r.complete);
  const recent = counting.slice(0, 5);
  const page = el('section', { class: 'page on', id: 'home' });

  page.innerHTML = `${heroHTML()}
    <button class="primary block" id="cta-new" style="margin-bottom:13px">New round</button>
    ${leakCardHTML(counting.length)}
    ${sgCardHTML()}
    ${statsHTML()}
    ${lastRoundHTML()}`;

  page.querySelector('#cta-new')?.addEventListener('click', () => go({ name: 'newround' }));
  const last = page.querySelector<HTMLElement>('#last-round');
  if (last) last.addEventListener('click', () => go({ name: 'review', id: last.dataset.id! }));

  return page;

  function heroHTML(): string {
    const sp = scoringPotential(rounds);
    if (!sp) {
      return `<div class="card read">
        <p class="eyebrow" style="text-align:center">Scoring potential</p>
        <div class="hero">
          <div class="pot">—</div>
          <div class="sub">Log your first round and StrokesIQ will project your scoring potential.</div>
        </div>
      </div>`;
    }
    const sgPerRound = (
      recent.reduce((s, r) => s + r.sg[sp.leak], 0) / (recent.length || 1)
    ).toFixed(1);
    return `<div class="card read">
      <p class="eyebrow" style="text-align:center">Scoring potential</p>
      <div class="hero">
        <div class="pot">${sp.potential}</div>
        <div class="sub">You're a <b>${sp.avgScore}</b> leaving <b>${sp.strokesLeft} strokes</b> on the course.<br>Fix your biggest leak and ${sp.potential} is in reach.</div>
        <div class="deltaline">
          <div><div class="v mono">${sp.avgScore}</div><div class="l">Avg score</div></div>
          <div><div class="v mono neg">${sgPerRound}</div><div class="l">${CATEGORY_LABELS[sp.leak]} SG</div></div>
          <div><div class="v mono">${counting.length}</div><div class="l">Rounds</div></div>
        </div>
      </div>
    </div>`;
  }

  function leakCardHTML(n: number): string {
    if (n < LEAK_GATE) {
      return `<div class="card">
        <h2><span class="num red">!</span> Biggest leak</h2>
        <div class="verdict leak"><span class="dim">${escapeHtml(gatingCopy(n, LEAK_GATE))}</span></div>
      </div>`;
    }
    const avg = rollingCategorySG(rounds)!;
    const leak = (Object.keys(avg) as (keyof typeof avg)[]).sort(
      (a, b) => avg[a] - avg[b],
    )[0];
    const copy = leakCopy(leak, avg[leak], supportingMetrics(recent));
    return `<div class="card">
      <h2><span class="num red">!</span> Biggest leak</h2>
      <div class="verdict leak"><b>${escapeHtml(copy.headline)}</b> <span class="dim">${escapeHtml(copy.detail)}</span></div>
    </div>`;
  }

  function sgCardHTML(): string {
    const avg = rollingCategorySG(rounds);
    if (!avg) return '';
    return `<div class="card">
      <h2>Strokes gained · last ${recent.length} round${recent.length === 1 ? '' : 's'}</h2>
      ${sgBarsHTML(avg)}
      <p style="font-size:11.5px;color:var(--ink-dim);margin:10px 0 0">Measured against scratch. Your worst category is where the strokes are hiding.</p>
    </div>`;
  }

  function statsHTML(): string {
    if (recent.length === 0) return '';
    const m = supportingMetrics(recent);
    const avgPutts = (
      recent.reduce((s, r) => s + r.stats.putts, 0) / recent.length
    ).toFixed(1);
    return `<div class="grid2" style="margin-bottom:13px">
      <div class="stat"><div class="l">Avg putts</div><div class="v mono">${avgPutts}</div><div class="d">${m.threePuttsPerRound.toFixed(1)} three-putts/rd</div></div>
      <div class="stat"><div class="l">GIR</div><div class="v mono">${Math.round(m.girPct)}<span class="u">%</span></div><div class="d">${Math.round((m.girPct / 100) * 18)} greens/round</div></div>
      <div class="stat"><div class="l">Fairways</div><div class="v mono">${Math.round(m.firPct)}<span class="u">%</span></div><div class="d">${((m.firPct / 100) * 14).toFixed(1)} of 14</div></div>
      <div class="stat"><div class="l">Penalties</div><div class="v mono">${m.penaltiesPerRound.toFixed(1)}</div><div class="d">per round</div></div>
    </div>`;
  }

  function lastRoundHTML(): string {
    if (rounds.length === 0) return '';
    const r = rounds[0];
    return `<p class="seclabel">Last round</p>
      <button class="rrow" id="last-round" data-id="${r.id}">
        <div class="meta"><div class="c">${escapeHtml(r.courseName)}</div><div class="d">${fmtDate(r.date)} · ${escapeHtml(r.tee)}</div></div>
        <div class="right"><div class="s mono">${r.stats.vsPar + r.coursePar}</div><div class="leak">${CATEGORY_LABELS[r.biggestLeak].toLowerCase()}</div></div>
      </button>`;
  }
}
