/** Tiny DOM helpers — keeps views terse without a framework. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  if (html !== undefined) node.innerHTML = html;
  return node;
}

export function qs<T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(sel);
}

export function qsa<T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Delegated click handler scoped to a root element. */
export function onClick(
  root: ParentNode,
  selector: string,
  handler: (target: HTMLElement, ev: MouseEvent) => void,
): void {
  root.addEventListener('click', (ev) => {
    const target = (ev.target as HTMLElement)?.closest(selector);
    if (target) handler(target as HTMLElement, ev as MouseEvent);
  });
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string): void {
  const t = qs('#toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
}
