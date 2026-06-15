import { el, escapeHtml, qs, toast } from '../dom';
import { go, getCourse, upsertCourse, removeCourse } from '../store';
import { buildCourse, teeNameFromLabel } from '../lib/course';

const PAR_DEFAULT_YDS = 520; // sensible starting yardage for a par 5

export function CourseSetupView(
  id?: string,
  from: 'newround' | 'more' = 'newround',
): HTMLElement {
  const page = el('section', { class: 'page on', id: 'coursesetup' });
  const existing = id ? getCourse(id) : undefined;
  const tee = existing?.tees[0];

  let name = existing?.name ?? '';
  let teeName = tee ? teeNameFromLabel(tee.label) : 'Blue';
  const holePars: (3 | 4 | 5)[] = tee?.holePars?.length === 18
    ? [...tee.holePars]
    : Array.from({ length: 18 }, () => 4 as 3 | 4 | 5);
  const holeYds: number[] = tee?.holeYds?.length === 18
    ? [...tee.holeYds]
    : Array.from({ length: 18 }, () => 0);

  page.innerHTML = `
    <div class="holehead">
      <div class="h">${existing ? 'Edit course' : 'New course'}</div>
      <button class="ghost" id="cancel" style="padding:5px 10px;font-size:12px">Cancel</button>
    </div>
    <p style="color:var(--ink-dim);font-size:13px;margin:0 2px 14px">Set each hole's par. Yardage is only needed on <b style="color:var(--ink)">par 5s</b> — that's what makes driving strokes-gained honest there.</p>

    <div class="card">
      <div class="field">
        <label>Course name</label>
        <input class="txtinput" id="cname" placeholder="e.g. Glen Abbey" value="${escapeHtml(name)}" />
      </div>
      <div class="field">
        <label>Tee name</label>
        <input class="txtinput" id="ctee" placeholder="e.g. Blue" value="${escapeHtml(teeName)}" />
      </div>
      <div class="field" style="margin-top:13px">
        <label>Total par</label>
        <div class="mono" id="totalpar" style="font-size:24px;font-weight:600">${sumPar()}</div>
      </div>
    </div>

    <p class="seclabel">Holes</p>
    <div class="card" id="holes">${rowsHTML()}</div>

    <button class="primary block" id="save">${existing ? 'Save changes' : 'Save course'}</button>
    <div class="spacer"></div>
    ${existing ? '<button class="danger block" id="delete">Delete course</button>' : ''}
    <div class="spacer"></div>`;

  qs<HTMLInputElement>('#cname', page)!.addEventListener('input', (ev) => {
    name = (ev.target as HTMLInputElement).value;
  });
  qs<HTMLInputElement>('#ctee', page)!.addEventListener('input', (ev) => {
    teeName = (ev.target as HTMLInputElement).value;
  });

  const holesEl = qs('#holes', page)!;
  holesEl.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;

    const parBtn = target.closest<HTMLElement>('button[data-par]');
    if (parBtn) {
      const n = Number(parBtn.dataset.n);
      const par = Number(parBtn.dataset.par) as 3 | 4 | 5;
      holePars[n - 1] = par;
      if (par === 5 && !holeYds[n - 1]) holeYds[n - 1] = PAR_DEFAULT_YDS;
      if (par !== 5) holeYds[n - 1] = 0;
      rerenderRow(n);
      qs('#totalpar', page)!.textContent = String(sumPar());
      return;
    }

    const ydBtn = target.closest<HTMLElement>('button[data-yd]');
    if (ydBtn) {
      const n = Number(ydBtn.dataset.yd);
      const dir = Number(ydBtn.dataset.dir);
      holeYds[n - 1] = Math.max(100, (holeYds[n - 1] || PAR_DEFAULT_YDS) + dir * 5);
      const input = qs<HTMLInputElement>(`#yd-${n}`, page);
      if (input) input.value = String(holeYds[n - 1]);
    }
  });

  qs('#cancel', page)!.addEventListener('click', () => go({ name: from }));
  qs('#save', page)!.addEventListener('click', async () => {
    const course = buildCourse({ id, name, teeName, holePars, holeYds });
    await upsertCourse(course);
    toast(existing ? 'Course updated' : 'Course saved');
    go({ name: from });
  });
  const delBtn = qs('#delete', page);
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      if (!confirm('Delete this course? Saved rounds keep their data.')) return;
      await removeCourse(id!);
      toast('Course deleted');
      go({ name: 'more' });
    });
  }

  return page;

  function sumPar(): number {
    return holePars.reduce((a, b) => a + b, 0);
  }

  function rowsHTML(): string {
    return holePars.map((_, i) => rowHTML(i + 1)).join('');
  }

  function rowHTML(n: number): string {
    const par = holePars[n - 1];
    const yd = holeYds[n - 1] || PAR_DEFAULT_YDS;
    const ydRow =
      par === 5
        ? `<div class="cyd">
             <div class="stepper">
               <button data-yd="${n}" data-dir="-1">−</button>
               <input id="yd-${n}" class="mono" value="${yd}" readonly />
               <button data-yd="${n}" data-dir="1">+</button>
             </div>
           </div>`
        : '';
    return `<div class="crow" data-row="${n}">
      <div class="top">
        <span class="hn mono">${n}</span>
        <div class="cpar">
          ${[3, 4, 5]
            .map(
              (p) =>
                `<button data-n="${n}" data-par="${p}" class="${par === p ? 'on' : ''}">${p}</button>`,
            )
            .join('')}
        </div>
      </div>
      ${ydRow}
    </div>`;
  }

  function rerenderRow(n: number): void {
    const row = qs(`.crow[data-row="${n}"]`, page);
    if (row) row.outerHTML = rowHTML(n);
  }
}
