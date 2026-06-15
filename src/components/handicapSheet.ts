import { qs, qsa, toast } from '../dom';
import { getState, updateHandicap, completeOnboarding } from '../store';

function clampHcap(n: number): number {
  return Math.max(0, Math.min(36, n));
}

/** Editable handicap sheet (reachable from the header pill and More). */
export function openHandicapSheet(): void {
  const current = getState().profile.handicap;
  renderModal({
    title: 'Starting handicap',
    sub: 'Sets the baseline for your strokes gained and scoring potential. It auto-refines as you log rounds.',
    initial: current,
    cancelLabel: 'Cancel',
    saveLabel: 'Save',
    dismissable: true,
    onSave: async (value) => {
      await updateHandicap(value);
      toast(`Baseline updated · HCP ${value}`);
    },
  });
}

/** First-run, one-question handicap capture (defaults to 14). */
export function openOnboarding(): void {
  renderModal({
    title: 'Welcome to StrokesIQ',
    sub: "What's your handicap? We use it as your baseline — start rough, it refines as you log rounds. Not sure? Leave it at 14.",
    initial: getState().profile.handicap,
    cancelLabel: null,
    saveLabel: 'Start tracking',
    dismissable: false,
    onSave: async (value) => {
      await completeOnboarding(value);
      toast('Baseline set');
    },
  });
}

interface ModalOpts {
  title: string;
  sub: string;
  initial: number;
  cancelLabel: string | null;
  saveLabel: string;
  dismissable: boolean;
  onSave: (value: number) => Promise<void>;
}

function renderModal(opts: ModalOpts): void {
  let value = clampHcap(opts.initial);
  const modal = document.createElement('div');
  modal.className = 'modal on';
  modal.innerHTML = `
    <div class="scrim" ${opts.dismissable ? 'data-close="1"' : ''}></div>
    <div class="sheet">
      <h3>${opts.title}</h3>
      <p class="sheetsub">${opts.sub}</p>
      <div class="stepper big">
        <button data-dir="-1">−</button>
        <input id="hcap-input" class="mono" value="${value}" readonly />
        <button data-dir="1">+</button>
      </div>
      <div class="btnrow">
        ${opts.cancelLabel ? `<button class="ghost" data-close="1">${opts.cancelLabel}</button>` : ''}
        <button class="primary" id="hcap-save">${opts.saveLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const input = qs<HTMLInputElement>('#hcap-input', modal)!;
  qsa('.stepper.big button', modal).forEach((btn) =>
    btn.addEventListener('click', () => {
      value = clampHcap(value + Number((btn as HTMLElement).dataset.dir));
      input.value = String(value);
    }),
  );

  function close(): void {
    modal.remove();
  }
  qsa('[data-close]', modal).forEach((b) => b.addEventListener('click', close));
  qs('#hcap-save', modal)!.addEventListener('click', async () => {
    await opts.onSave(value);
    close();
  });
}
