import './style.css';

const root = document.querySelector<HTMLDivElement>('#app')!;
const search = new URLSearchParams(location.search);

if (search.has('level') || search.has('scenario')) {
  void import('./game/Game').then(({ Game }) => new Game(root));
} else {
  void import('./game/Menu').then(({ Menu }) => new Menu(root));
}
