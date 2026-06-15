import { el, qs, qsa, toast } from '../dom';
import {
  getDraft,
  loadCurrentHole,
  saveHole,
  gotoHole,
  finishDraft,
  discardDraft,
  go,
} from '../store';
import { MIN_COUNTING_HOLES } from '../lib/sg/engine';
import type { Hole, Lie, MissCell, TeeResult } from '../lib/sg/types';

const MISS_NAMES: Record<MissCell, string> = {
  green: 'On the green · GIR',
  S: 'Short of the green',
  L: 'Long',
  left: 'Left',
  right: 'Right',
  SL: 'Short left',
  SR: 'Short right',
  LL: 'Long left',
  LR: 'Long right',
};

export function HoleEntryView(): HTMLElement {
  const draft = getDraft();
  const page = el('section', { class: 'page on', id: 'hole' });
  if (!draft) {
    page.innerHTML = `<p class="emptystate" style="padding:20px">No round in progress.</p>`;
    return page;
  }

  const cur: Hole = loadCurrentHole();
  const total = draft.total;
  const idx = draft.current;
  const isLast = idx === total;

  page.innerHTML = `
    <div class="holehead">
      <div class="h">Hole <span class="mono">${idx}</span><span class="parlbl" id="parlbl"> · par ${cur.par}</span></div>
      <button class="ghost" id="finish-early" style="padding:5px 10px;font-size:12px">Finish</button>
    </div>
    <div class="holestrip" id="holestrip">${stripHTML()}</div>

    <div class="card">
      <div class="field">
        <label>Par</label>
        <div class="parpick" id="parpick">
          ${[3, 4, 5].map((p) => `<button data-par="${p}" class="${cur.par === p ? 'on' : ''}">${p}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Score</label>
        ${stepperHTML('score', cur.score)}
      </div>
    </div>

    <div class="card" id="teecard" style="display:${cur.par === 3 ? 'none' : 'block'}">
      <h2><span class="num">1</span> Tee shot</h2>
      <div class="field">
        <label>Result</label>
        <div class="seg" id="teeres">
          ${segHTML([['fairway', 'Fairway'], ['left', 'Left'], ['right', 'Right'], ['penalty', 'Penalty']], cur.teeResult ?? 'fairway')}
        </div>
      </div>
      <div class="field">
        <label>Driving distance <span class="u">(yds)</span></label>
        ${stepperHTML('drive', cur.driveYds ?? 240)}
      </div>
    </div>

    <div class="card">
      <h2><span class="num">2</span> Approach</h2>
      <div class="field">
        <label>Distance to pin <span class="u">(yds)</span></label>
        ${stepperHTML('appr', cur.approachYds)}
      </div>
      <div class="field">
        <label>Where it finished</label>
        <div class="padwrap">
          <div class="pad" id="pad">
            ${padHTML(cur.missCell)}
          </div>
          <div class="padhelp">
            Tap where the ball ended up. Center is a <b>green hit</b>.<br>
            One tap sets GIR <i>and</i> your miss direction.
            <div class="tag" id="padtag"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2><span class="num">3</span> Putting</h2>
      <div class="field" id="fp-field">
        <label>First putt distance <span class="u">(ft)</span></label>
        ${stepperHTML('fp', cur.firstPuttFt)}
      </div>
      <div class="field">
        <label>Total putts</label>
        ${stepperHTML('putts', cur.putts)}
      </div>
    </div>

    <div class="card" id="shortcard" style="display:${cur.gir ? 'none' : 'block'}">
      <h2><span class="num">4</span> Short game</h2>
      <p class="cardhint">You missed the green — log the up &amp; down.</p>
      <div class="field">
        <label>Lie</label>
        <div class="seg" id="lie">${segHTML([['rough', 'Rough'], ['fairway', 'Fairway'], ['sand', 'Sand']], cur.lie ?? 'rough')}</div>
      </div>
      <div class="field">
        <label>Up &amp; down</label>
        <div class="seg" id="updown">${segHTML([['made', 'Made'], ['missed', 'Missed']], cur.upDown ? 'made' : 'missed')}</div>
      </div>
    </div>

    <div class="card">
      <div class="field" style="margin:0">
        <label>Penalty strokes</label>
        <div class="seg" id="pen">${segHTML([['0', '0'], ['1', '1'], ['2', '2+']], String(Math.min(cur.penalties, 2)))}</div>
      </div>
    </div>

    <div class="btnrow">
      <button class="ghost" id="prev">← Prev</button>
      <button class="primary" id="next">${isLast ? 'Finish round →' : 'Next hole →'}</button>
    </div>
    <div class="spacer"></div><div class="spacer"></div>`;

  wire();
  updatePadTag();
  syncPuttingVisibility();

  return page;

  // --- HTML builders ---

  function stepperHTML(id: string, value: number): string {
    return `<div class="stepper">
      <button data-step="${id}" data-dir="-1">−</button>
      <input id="f-${id}" class="mono" value="${value}" readonly />
      <button data-step="${id}" data-dir="1">+</button>
    </div>`;
  }

  function segHTML(opts: [string, string][], active: string): string {
    return opts
      .map(
        ([val, label]) =>
          `<button data-val="${val}" class="${val === active ? 'on' : ''}">${label}</button>`,
      )
      .join('');
  }

  function padHTML(active: MissCell): string {
    const cells: [MissCell, string][] = [
      ['LL', 'L·L'], ['L', 'long'], ['LR', 'L·R'],
      ['left', 'left'], ['green', ''], ['right', 'right'],
      ['SL', 'S·L'], ['S', 'short'], ['SR', 'S·R'],
    ];
    return cells
      .map(([m, label]) => {
        const center = m === 'green';
        const on = m === active;
        const inner = center ? '<span class="dot"></span>' : label;
        return `<button data-m="${m}" class="${center ? 'center' : ''}${on ? ' on' : ''}">${inner}</button>`;
      })
      .join('');
  }

  function stripHTML(): string {
    let html = '';
    for (let n = 1; n <= total; n++) {
      const done = draft!.holes.has(n);
      const cls = n === idx ? 'cur' : done ? 'done' : '';
      html += `<button class="${cls}" data-hole="${n}">${n}</button>`;
    }
    return html;
  }

  // --- helpers operating on cur + DOM ---

  function setVal(id: string, v: number): void {
    const input = qs<HTMLInputElement>(`#f-${id}`, page);
    if (input) input.value = String(v);
  }

  function updatePadTag(): void {
    const tag = qs('#padtag', page)!;
    cur.gir = cur.missCell === 'green';
    tag.textContent = MISS_NAMES[cur.missCell] ?? '';
    tag.style.color = cur.gir ? 'var(--path)' : 'var(--red)';
    qs('#shortcard', page)!.style.display = cur.gir ? 'none' : 'block';
    if (cur.gir) {
      cur.lie = null;
      cur.upDown = null;
    } else if (cur.lie === null) {
      cur.lie = 'rough';
      cur.upDown = false;
    }
  }

  function syncPuttingVisibility(): void {
    // Chip-in: putts === 0 → first-putt distance is irrelevant (spec 5.2).
    qs('#fp-field', page)!.style.display = cur.putts <= 0 ? 'none' : 'block';
  }

  function persistAndGo(n: number): void {
    if (cur.par >= 4 && cur.teeResult === null) cur.teeResult = 'fairway';
    saveHole(cur);
    gotoHole(n);
  }

  // --- wiring ---

  function wire(): void {
    qs('#holestrip', page)!.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('button[data-hole]');
      if (btn) persistAndGo(Number(btn.dataset.hole));
    });

    page.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('button[data-step]');
      if (!btn) return;
      const id = btn.dataset.step!;
      const dir = Number(btn.dataset.dir);
      step(id, dir);
    });

    qs('#parpick', page)!.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('button[data-par]');
      if (!btn) return;
      const par = Number(btn.dataset.par) as 3 | 4 | 5;
      cur.par = par;
      qsa('#parpick button', page).forEach((b) =>
        b.classList.toggle('on', Number(b.dataset.par) === par),
      );
      qs('#parlbl', page)!.textContent = ` · par ${par}`;
      qs('#teecard', page)!.style.display = par === 3 ? 'none' : 'block';
      if (par === 3) {
        cur.teeResult = null;
        cur.driveYds = null;
      } else {
        cur.teeResult ??= 'fairway';
        cur.driveYds ??= 240;
        setVal('drive', cur.driveYds);
      }
    });

    qs('#pad', page)!.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('button[data-m]');
      if (!btn) return;
      qsa('#pad button', page).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      cur.missCell = btn.dataset.m as MissCell;
      updatePadTag();
    });

    segWire('teeres', (v) => (cur.teeResult = v as TeeResult));
    segWire('lie', (v) => (cur.lie = v as Lie));
    segWire('updown', (v) => (cur.upDown = v === 'made'));
    segWire('pen', (v) => (cur.penalties = Number(v)));

    qs('#prev', page)!.addEventListener('click', () => {
      if (idx > 1) persistAndGo(idx - 1);
    });
    qs('#next', page)!.addEventListener('click', () => {
      saveHole(cur);
      if (isLast) void finish();
      else gotoHole(idx + 1);
    });
    qs('#finish-early', page)!.addEventListener('click', () => void finish());
  }

  function segWire(id: string, set: (v: string) => void): void {
    const root = qs(`#${id}`, page);
    if (!root) return;
    root.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest<HTMLElement>('button[data-val]');
      if (!btn) return;
      qsa(`#${id} button`, page).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      set(btn.dataset.val!);
    });
  }

  function step(id: string, dir: number): void {
    const config: Record<string, { min: number; step: number }> = {
      score: { min: 1, step: 1 },
      drive: { min: 60, step: 5 },
      appr: { min: 5, step: 5 },
      fp: { min: 0, step: 1 },
      putts: { min: 0, step: 1 },
    };
    const { min, step: delta } = config[id];
    const next = Math.max(min, current(id) + dir * delta);
    apply(id, next);
    setVal(id, next);
    if (id === 'putts') syncPuttingVisibility();
  }

  function current(id: string): number {
    switch (id) {
      case 'score': return cur.score;
      case 'drive': return cur.driveYds ?? 240;
      case 'appr': return cur.approachYds;
      case 'fp': return cur.firstPuttFt;
      case 'putts': return cur.putts;
      default: return 0;
    }
  }

  function apply(id: string, v: number): void {
    switch (id) {
      case 'score': cur.score = v; break;
      case 'drive': cur.driveYds = v; break;
      case 'appr': cur.approachYds = v; break;
      case 'fp': cur.firstPuttFt = v; break;
      case 'putts': cur.putts = v; break;
    }
  }

  async function finish(): Promise<void> {
    const count = draft!.holes.size;
    if (count < MIN_COUNTING_HOLES) {
      const ok = confirm(
        `Only ${count} hole${count === 1 ? '' : 's'} entered. Rounds under ${MIN_COUNTING_HOLES} holes are saved but won't count toward your trends. Finish anyway?`,
      );
      if (!ok) return;
    }
    if (count === 0) {
      discardDraft();
      go({ name: 'home' });
      return;
    }
    const id = await finishDraft();
    toast('Round saved');
    go({ name: 'review', id });
  }
}
