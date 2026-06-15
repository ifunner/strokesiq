import { qs, qsa } from './dom';
import { getState, subscribe, loadAll, go, type Route } from './store';
import { BRAND_MARK, ICON_HOME, ICON_ROUNDS, ICON_MORE } from './components/icons';
import { openHandicapSheet, openOnboarding } from './components/handicapSheet';
import { HomeView } from './views/home';
import { NewRoundView } from './views/newRound';
import { HoleEntryView } from './views/holeEntry';
import { RoundReviewView } from './views/roundReview';
import { RoundsView } from './views/rounds';
import { MoreView } from './views/more';
import { CourseSetupView } from './views/courseSetup';

const TAB_FOR: Record<Route['name'], 'home' | 'rounds' | 'more'> = {
  home: 'home',
  newround: 'home',
  hole: 'home',
  review: 'rounds',
  rounds: 'rounds',
  more: 'more',
  courseSetup: 'home',
};

export async function initApp(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="app">
      <header>
        <div class="brand">${BRAND_MARK}<h1>Strokes<b>IQ</b></h1></div>
        <button class="pill" id="hcap-pill">HCP 14</button>
      </header>
      <main id="view"></main>
    </div>
    <nav class="tabbar">
      <div class="inner">
        <button data-tab="home" id="tab-home">${ICON_HOME}Home</button>
        <button data-tab="rounds" id="tab-rounds">${ICON_ROUNDS}Rounds</button>
        <button data-tab="more" id="tab-more">${ICON_MORE}More</button>
      </div>
    </nav>
    <div class="toast" id="toast"></div>`;

  qs('#hcap-pill', root)!.addEventListener('click', () => openHandicapSheet());
  qsa('.tabbar button', root).forEach((btn) =>
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLElement).dataset.tab as 'home' | 'rounds' | 'more';
      go({ name: tab });
    }),
  );

  subscribe(render);

  await loadAll();
  if (!getState().profile.onboarded) openOnboarding();
  render();
}

function render(): void {
  const { route, profile } = getState();

  const pill = qs('#hcap-pill');
  if (pill) pill.textContent = `HCP ${profile.handicap}`;

  const tab = TAB_FOR[route.name];
  qsa('.tabbar button').forEach((b) =>
    b.classList.toggle('on', (b as HTMLElement).dataset.tab === tab),
  );

  const view = qs('#view');
  if (!view) return;
  view.replaceChildren(viewFor(route));
}

function viewFor(route: Route): HTMLElement {
  switch (route.name) {
    case 'home': return HomeView();
    case 'newround': return NewRoundView();
    case 'hole': return HoleEntryView();
    case 'review': return RoundReviewView(route.id);
    case 'rounds': return RoundsView();
    case 'more': return MoreView();
    case 'courseSetup': return CourseSetupView(route.id, route.from);
  }
}
