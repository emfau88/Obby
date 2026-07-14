import { LEVELS } from './LevelData';
import { loadProgress } from './ProgressManager';

const stars = (count: number) => `${'★'.repeat(count)}${'☆'.repeat(3 - count)}`;

export class Menu {
  constructor(root: HTMLElement) {
    document.body.classList.add('menu-active');
    const progress = loadProgress();
    const available = LEVELS.filter(level => progress.unlocked.includes(level.id));
    const next = available.find(level => !progress.levels[level.id]?.completed)
      ?? available[available.length - 1]
      ?? LEVELS[0];
    const completed = LEVELS.filter(level => progress.levels[level.id]?.completed).length;
    const totalStars = LEVELS.reduce((total, level) => total + (progress.levels[level.id]?.stars ?? 0), 0);
    const completionPercent = Math.round((completed / LEVELS.length) * 100);

    root.classList.add('menu-root');
    root.innerHTML = `
      <main class="menu-screen">
        <div class="menu-scenery" aria-hidden="true">
          <i class="sky-sun"></i><i class="sky-ring ring-a"></i><i class="sky-ring ring-b"></i>
          <i class="menu-cloud cloud-a"></i><i class="menu-cloud cloud-b"></i><i class="menu-cloud cloud-c"></i>
          <i class="floating-island island-a"></i><i class="floating-island island-b"></i>
          <i class="sky-spark spark-a"></i><i class="sky-spark spark-b"></i><i class="sky-spark spark-c"></i>
        </div>
        <header class="menu-header">
          <div class="eyebrow"><i></i>A SKYBOUND ADVENTURE <b>CHAPTER I</b></div>
          <h1><span class="title-cloud">CLOUDTOP</span><br><span class="title-run">RUN</span></h1>
          <p>Leap across floating islands, master every route and rise all the way to Cloudtop Castle.</p>
          <div class="journey-strip" aria-label="${completionPercent}% of the journey complete">
            <div><span>JOURNEY PROGRESS</span><b>${completed} / ${LEVELS.length} LEVELS</b></div>
            <div class="journey-track"><i style="width:${completionPercent}%"></i></div>
          </div>
          <a class="primary-play" data-testid="continue-adventure" href="?level=${next.id}">
            <i class="play-icon" aria-hidden="true">▶</i>
            <span class="play-copy"><b>${completed ? 'CONTINUE ADVENTURE' : 'START ADVENTURE'}</b><small>LEVEL ${next.number} · ${next.subtitle.toUpperCase()}</small></span>
            <i class="play-arrow" aria-hidden="true">→</i>
          </a>
          <div class="hero-meta" aria-label="Game overview">
            <span><i>◆</i><b>${LEVELS.length}</b> SKY TRIALS</span>
            <span><i>★</i><b>${LEVELS.length * 3}</b> MASTERY STARS</span>
            <span><i>↻</i> INSTANT RETRIES</span>
          </div>
        </header>
        <section class="level-select" aria-labelledby="level-heading">
          <div class="panel-glint" aria-hidden="true"></div>
          <div class="select-heading">
            <div><span>EXPEDITION MAP</span><h2 id="level-heading">Choose your ascent</h2></div>
            <div class="profile-summary"><b>${totalStars} <i>★</i></b><small>OF ${LEVELS.length * 3} COLLECTED</small></div>
          </div>
          <div class="level-grid">
            ${LEVELS.map(level => {
              const unlocked = progress.unlocked.includes(level.id);
              const result = progress.levels[level.id];
              const state = result?.completed ? 'MASTERED' : unlocked ? 'READY' : 'LOCKED';
              const content = `
                <div class="level-art level-art-${level.number}">
                  <div class="art-horizon" aria-hidden="true"><i></i><i></i><i></i></div>
                  <b>0${level.number}</b><span>${unlocked ? stars(result?.stars ?? 0) : 'LOCKED'}</span>
                </div>
                <div class="level-copy">
                  <div class="level-topline"><small>LEVEL ${level.number} · ${level.subtitle}</small><b class="state-chip ${state.toLowerCase()}">${state}</b></div>
                  <h3>${level.title}</h3><p>${level.description}</p>
                  <div class="level-stats">${result ? `<span><i>◷</i> Best ${result.bestTime.toFixed(1)}s</span><span><i>●</i> ${result.bestCoins} / ${level.coins.length} coins</span>` : '<span><i>◇</i> New route</span><span><i>●</i> Hidden collectibles</span>'}</div>
                </div>
                ${unlocked ? '<div class="card-arrow" aria-hidden="true">→</div>' : ''}`;
              return unlocked
                ? `<a class="level-card" data-testid="level-${level.number}" href="?level=${level.id}">${content}</a>`
                : `<article class="level-card locked" aria-label="Level ${level.number} locked">${content}<div class="lock-badge"><i>◆</i> COMPLETE LEVEL ${level.number - 1}</div></article>`;
            }).join('')}
          </div>
          <div class="panel-note"><span>SELECT A ROUTE TO BEGIN</span><i></i><b>PROGRESS SAVES AUTOMATICALLY</b></div>
        </section>
        <footer class="menu-footer"><span><b>WASD</b> / ARROWS TO MOVE</span><i></i><span><b>SPACE</b> TO JUMP</span><i></i><span><b>SHIFT</b> TO DASH</span></footer>
      </main>
    `;
  }
}
