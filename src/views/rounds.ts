import { el, escapeHtml, qs } from '../dom';
import { getState, go } from '../store';
import { CATEGORY_LABELS } from '../lib/sg/types';
import { fmtDate } from '../util';

export function RoundsView(): HTMLElement {
  const { rounds } = getState();
  const page = el('section', { class: 'page on', id: 'rounds' });

  page.innerHTML = `
    <h2 style="font-size:18px;margin:0 2px 4px">Rounds</h2>
    <p style="color:var(--ink-dim);font-size:13px;margin:0 2px 16px">Every scored round lives here. Tap one to reopen its review.</p>
    <div id="historylist">${listHTML()}</div>
    <button class="primary block" id="new">New round</button>
    <div class="spacer"></div>`;

  qs('#new', page)!.addEventListener('click', () => go({ name: 'newround' }));
  qs('#historylist', page)!.addEventListener('click', (ev) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('.rrow');
    if (row?.dataset.id) go({ name: 'review', id: row.dataset.id });
  });

  return page;

  function listHTML(): string {
    if (rounds.length === 0) {
      return `<p class="emptystate" style="margin:0 2px 16px">No rounds yet. Start your first round and StrokesIQ goes to work.</p>`;
    }
    return rounds
      .map((r) => {
        const score = r.stats.vsPar + r.coursePar;
        return `<button class="rrow" data-id="${r.id}">
          <div class="meta"><div class="c">${escapeHtml(r.courseName)}</div><div class="d">${fmtDate(r.date)} · ${escapeHtml(r.tee)}${r.complete ? '' : ' · partial'}</div></div>
          <div class="right"><div class="s mono">${score}</div><div class="leak">${CATEGORY_LABELS[r.biggestLeak].toLowerCase()}</div></div>
        </button>`;
      })
      .join('');
  }
}
