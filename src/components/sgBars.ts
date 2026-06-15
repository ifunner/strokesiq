import { CATEGORY_ORDER, CATEGORY_LABELS, type CategorySG } from '../lib/sg/types';

/** Diverging strokes-gained bars: red left for losses, green right for gains. */
export function sgBarsHTML(sg: CategorySG): string {
  return CATEGORY_ORDER.map((k) => {
    const v = sg[k];
    const mag = Math.min(Math.abs(v) / 5, 1) * 50; // half-width max
    const cls = v >= 0 ? 'pos' : 'neg';
    const bar =
      v >= 0
        ? `<i class="pos" style="width:${mag}%"></i>`
        : `<i class="neg" style="width:${mag}%"></i>`;
    return `<div class="sgrow">
      <div class="lab">${CATEGORY_LABELS[k]}</div>
      <div class="sgbar"><span class="z"></span>${bar}</div>
      <div class="val ${cls}">${v >= 0 ? '+' : ''}${v.toFixed(1)}</div>
    </div>`;
  }).join('');
}
