import { el, qs, toast } from '../dom';
import { getState, loadAll, go } from '../store';
import { openHandicapSheet } from '../components/handicapSheet';
import { exportBackup, importBackup, type Backup } from '../lib/storage/adapter';
import { fmtLongDate } from '../util';

export function MoreView(): HTMLElement {
  const { profile } = getState();
  const page = el('section', { class: 'page on', id: 'more' });

  page.innerHTML = `
    <h2 style="font-size:18px;margin:0 2px 16px">More</h2>

    <details open>
      <summary>How StrokesIQ works</summary>
      <div class="body">Every shot is scored against <b>strokes gained</b> — the standard the tour uses. We compare where your shot started and finished to what a scratch golfer would average from those spots. The gap, in strokes, tells you exactly where your round leaked. <b>Approach, putting, and driving</b> each get their own number so you can stop guessing what to practice.</div>
    </details>
    <details>
      <summary>Why approach distances matter</summary>
      <div class="body">Distances are what turn stats into strokes gained. A green hit from 80 yds and a green hit from 190 yds are not the same shot — entering the distance lets us value them honestly.</div>
    </details>

    <p class="seclabel">Baseline</p>
    <button class="rrow" id="hcap-row">
      <div class="meta"><div class="c">Starting handicap</div><div class="d">Drives your scoring potential and leak ranking</div></div>
      <div class="right"><div class="s mono">${profile.handicap}</div></div>
    </button>

    <p class="seclabel">Your data</p>
    <div class="card">
      <p class="emptystate" style="margin:0 0 12px">iOS can clear an unused web app's storage. Export after big rounds — it's your real backup.</p>
      <button class="ghost block" id="export">Export backup (JSON)</button>
      <div class="spacer"></div>
      <button class="ghost block" id="import">Import backup</button>
      <input type="file" id="importfile" accept="application/json,.json" style="display:none" />
    </div>

    <details>
      <summary>GolfIQ suite</summary>
      <div class="body"><b>GreenIQ</b> reads your putts on the green. <b>PracticeIQ</b> turns your biggest leak into a practice plan. StrokesIQ tells both of them where to aim.</div>
    </details>

    <footer>StrokesIQ · GolfIQ suite<br>Strokes gained estimated from your entered data. Not a substitute for a coach.</footer>`;

  qs('#hcap-row', page)!.addEventListener('click', () => openHandicapSheet());

  qs('#export', page)!.addEventListener('click', async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `strokesiq-backup-${fmtLongDate(backup.exportedAt).replace(/[ ,]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup exported');
  });

  const fileInput = qs<HTMLInputElement>('#importfile', page)!;
  qs('#import', page)!.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as Backup;
      const replace = confirm(
        'Replace all current data with this backup?\n\nOK = replace everything · Cancel = merge into existing data.',
      );
      const res = await importBackup(backup, replace ? 'replace' : 'merge');
      await loadAll();
      toast(`Imported ${res.rounds} round${res.rounds === 1 ? '' : 's'}`);
      go({ name: 'more' });
    } catch (err) {
      toast('Import failed — not a valid backup');
      console.error(err);
    } finally {
      fileInput.value = '';
    }
  });

  return page;
}
