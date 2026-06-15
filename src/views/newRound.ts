import { el, escapeHtml, qs, qsa } from '../dom';
import { getState, go, startDraft, type DraftMeta } from '../store';
import { holeYdsFromCourse } from '../lib/sg/round';
import type { Course, CourseTee } from '../lib/sg/types';
import { todayISODate } from '../util';

interface DefaultTee {
  label: string;
  par: number;
  holePars: (3 | 4 | 5)[];
}

const GENERIC_TEES: DefaultTee[] = [
  { label: 'White · 72', par: 72, holePars: [] },
  { label: 'Blue · 72', par: 72, holePars: [] },
  { label: 'Black · 73', par: 73, holePars: [] },
];

export function NewRoundView(): HTMLElement {
  const { courses } = getState();
  const page = el('section', { class: 'page on', id: 'newround' });

  let selectedCourse: Course | null = null;
  let courseName = '';
  let teeLabel = GENERIC_TEES[1].label;
  let dateISO = todayISODate();

  page.innerHTML = `
    <h2 class="card" style="border:none;background:none;box-shadow:none;padding:0;margin:0 2px 4px;font-size:18px">New round</h2>
    <p style="color:var(--ink-dim);font-size:13px;margin:0 2px 16px">Saved courses remember their pars — pick one to skip ahead.</p>
    <div class="card">
      <div class="field">
        <label>Course</label>
        <input class="txtinput" id="coursename" placeholder="Search or type a course" />
        <div class="chips" id="course-chips" style="margin-top:10px">${chipsHTML()}</div>
        <button class="linkbtn" id="editcourse" style="display:none;margin-top:10px;color:var(--path)">Edit pars &amp; yardages →</button>
      </div>
      <div class="field">
        <label>Tee box</label>
        <div class="seg" id="teeseg">${teeSegHTML()}</div>
      </div>
      <div class="field">
        <label>Date</label>
        <input class="txtinput" id="datefield" type="date" value="${dateISO}" />
      </div>
    </div>
    <button class="primary block" id="start">Start round →</button>
    <div class="spacer"></div>
    <button class="ghost block" id="cancel">Cancel</button>`;

  const nameInput = qs<HTMLInputElement>('#coursename', page)!;
  nameInput.addEventListener('input', () => {
    courseName = nameInput.value;
  });

  const editLink = qs<HTMLButtonElement>('#editcourse', page)!;
  editLink.addEventListener('click', () => {
    if (selectedCourse) go({ name: 'courseSetup', id: selectedCourse.id, from: 'newround' });
  });

  qs('#course-chips', page)!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('.chip');
    if (!chip) return;
    if (chip.dataset.new) {
      go({ name: 'courseSetup', from: 'newround' });
      return;
    }
    if (!chip.dataset.id) return;
    selectedCourse = courses.find((c) => c.id === chip.dataset.id) ?? null;
    courseName = selectedCourse?.name ?? courseName;
    nameInput.value = courseName;
    teeLabel = (selectedCourse?.tees[0]?.label) ?? teeLabel;
    qsa('.chip', page).forEach((c) => c.classList.remove('on'));
    chip.classList.add('on');
    qs('#teeseg', page)!.innerHTML = teeSegHTML();
    editLink.style.display = selectedCourse ? 'inline' : 'none';
  });

  qs('#teeseg', page)!.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>('button');
    if (!btn || !btn.dataset.label) return;
    teeLabel = btn.dataset.label;
    qsa('#teeseg button', page).forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
  });

  qs<HTMLInputElement>('#datefield', page)!.addEventListener('change', (ev) => {
    dateISO = (ev.target as HTMLInputElement).value || dateISO;
  });

  qs('#cancel', page)!.addEventListener('click', () => go({ name: 'home' }));
  qs('#start', page)!.addEventListener('click', () => {
    const meta = buildMeta();
    startDraft(meta, 18);
    go({ name: 'hole' });
  });

  return page;

  function chipsHTML(): string {
    const saved = courses
      .map(
        (c) =>
          `<button class="chip" data-id="${c.id}">${escapeHtml(c.name)}</button>`,
      )
      .join('');
    return `${saved}<button class="chip" data-new="1">+ New course</button>`;
  }

  function activeTees(): (CourseTee | DefaultTee)[] {
    return selectedCourse ? selectedCourse.tees : GENERIC_TEES;
  }

  function teeSegHTML(): string {
    return activeTees()
      .map(
        (t) =>
          `<button data-label="${escapeHtml(t.label)}" class="${t.label === teeLabel ? 'on' : ''}">${escapeHtml(t.label)}</button>`,
      )
      .join('');
  }

  function buildMeta(): DraftMeta {
    const tees = activeTees();
    const tee = tees.find((t) => t.label === teeLabel) ?? tees[0];
    const name = (courseName || nameInput.value || 'Unnamed course').trim();
    return {
      courseId: selectedCourse?.id ?? null,
      courseName: name,
      tee: tee.label,
      coursePar: tee.par,
      date: dateISO,
      holePars: 'holePars' in tee ? tee.holePars : [],
      holeYdsByNumber: holeYdsFromCourse(selectedCourse, tee.label),
    };
  }
}
