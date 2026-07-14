import { levelData } from './LevelData';
import { saveResult, starsFor } from './ProgressManager';

export class UIManager {
  private toastTimer = 0;
  private hintTimer = 0;
  private respawnTimer = 0;

  constructor(root: HTMLElement) {
    const mastery = levelData.mastery;
    root.insertAdjacentHTML('beforeend', `
      <div id="hud">
        <section class="brand"><b>${levelData.title.toUpperCase()}</b><small id="section-label">ACT I · ${levelData.acts[0].name.toUpperCase()}</small></section>
        <div class="progress" aria-label="Level progress"><i></i><span>☆☆☆</span></div>
        <section class="status"><b id="counter">0 / ${levelData.coins.length} 🪙</b><small id="falls">0 falls</small></section>
      </div>
      <button id="menu-button" aria-label="Level select">☰</button>
      <div id="joystick" aria-label="Movement joystick"><div id="stick"></div></div>
      <div class="actions">
        <button id="dash" aria-label="Dash">DASH</button>
        <button id="jump" aria-label="Jump">JUMP</button>
      </div>
      <div id="hint"></div><div id="toast"></div><div id="respawn"><b></b></div>
      <div id="complete"><div class="card">
        <small class="result-kicker">LEVEL ${levelData.number} COMPLETE</small>
        <h1>${levelData.completeTitle}</h1><div id="stars">★★★</div><p id="result"></p>
        <small class="mastery">Mastery: ${mastery.coins} coins · under ${mastery.time}s · max ${mastery.falls} falls</small>
        <div><button id="restart">Restart</button><button id="continue">${levelData.nextId ? 'Next Level' : 'Level Select'}</button></div>
      </div></div>
    `);
  }

  update(coins: number, progress: number, dashReady: number, falls: number, actIndex: number) {
    document.querySelector('#counter')!.textContent = `${coins} / ${levelData.coins.length} 🪙`;
    document.querySelector('#falls')!.textContent = `${falls} fall${falls === 1 ? '' : 's'}`;
    document.querySelector<HTMLElement>('.progress i')!.style.width = `${Math.round(progress * 100)}%`;
    document.querySelector<HTMLElement>('#dash')!.style.setProperty(
      '--dash-ready', `${Math.max(0, Math.min(1, dashReady)) * 360}deg`,
    );
    const act = Math.max(0, Math.min(levelData.acts.length - 1, actIndex));
    document.querySelector('#section-label')!.textContent = `ACT ${['I', 'II', 'III'][act]} · ${levelData.acts[act].name.toUpperCase()}`;
  }

  toast(message: string) {
    const element = document.querySelector<HTMLElement>('#toast')!;
    window.clearTimeout(this.toastTimer);
    element.textContent = message;
    element.classList.add('show');
    this.toastTimer = window.setTimeout(() => element.classList.remove('show'), 1150);
  }

  hint(message: string, duration = 2300) {
    const element = document.querySelector<HTMLElement>('#hint')!;
    window.clearTimeout(this.hintTimer);
    element.textContent = message;
    element.classList.add('show');
    this.hintTimer = window.setTimeout(() => element.classList.remove('show'), duration);
  }

  respawn(message: string) {
    const element = document.querySelector<HTMLElement>('#respawn')!;
    window.clearTimeout(this.respawnTimer);
    element.querySelector('b')!.textContent = message;
    element.classList.remove('show');
    requestAnimationFrame(() => element.classList.add('show'));
    this.respawnTimer = window.setTimeout(() => element.classList.remove('show'), 900);
  }

  setCinematic(active: boolean) {
    document.body.classList.toggle('cinematic', active);
  }

  complete(time: number, coins: number, falls: number, persist = true) {
    const stars = starsFor(levelData, time, coins, falls);
    document.querySelector('#stars')!.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    let bestLine = '';
    if (persist) {
      const { result } = saveResult(levelData, time, coins, falls);
      bestLine = `Best <b>${result.bestTime.toFixed(1)}s</b>`;
    }
    const resultLines = [
      `Time <b>${time.toFixed(1)}s</b>`,
      `Coins <b>${coins} / ${levelData.coins.length}</b>`,
      `Falls <b>${falls}</b>`,
    ];
    if (bestLine) resultLines.push(bestLine);
    document.querySelector('#result')!.innerHTML = resultLines.join('<br>');
    document.querySelector('#complete')!.classList.add('visible');
  }
}
