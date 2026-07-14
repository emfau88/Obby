export type SoundType = 'jump' | 'land' | 'dash' | 'bounce' | 'coin' | 'check' | 'hit' | 'finish';

type SoundConfig = {
  file: string;
  volume: number;
  playbackRate?: number;
  channels?: number;
};

const SOUNDS: Record<SoundType, SoundConfig> = {
  jump: { file: 'jump.wav', volume: .28, channels: 3 },
  land: { file: 'land.wav', volume: .2, channels: 3 },
  dash: { file: 'dash.wav', volume: .24, playbackRate: 1.3, channels: 2 },
  bounce: { file: 'bounce.wav', volume: .3, playbackRate: .96, channels: 2 },
  coin: { file: 'coin.wav', volume: .24, playbackRate: 1.06, channels: 4 },
  check: { file: 'checkpoint.wav', volume: .3, channels: 2 },
  hit: { file: 'hit.wav', volume: .3, channels: 2 },
  finish: { file: 'finish.wav', volume: .34 },
};

export class AudioManager {
  private pools = new Map<SoundType, HTMLAudioElement[]>();
  private cursor = new Map<SoundType, number>();

  constructor() {
    const base = import.meta.env.BASE_URL;
    (Object.entries(SOUNDS) as [SoundType, SoundConfig][]).forEach(([type, config]) => {
      const pool = Array.from({ length: config.channels ?? 1 }, () => {
        const audio = new Audio(`${base}audio/${config.file}`);
        audio.preload = 'auto';
        audio.volume = config.volume;
        audio.playbackRate = config.playbackRate ?? 1;
        return audio;
      });
      this.pools.set(type, pool);
      this.cursor.set(type, 0);
    });
  }

  play(type: SoundType) {
    const pool = this.pools.get(type);
    if (!pool?.length) return;
    const index = this.cursor.get(type) ?? 0;
    const audio = pool[index];
    this.cursor.set(type, (index + 1) % pool.length);
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Browsers may ignore sounds until the first keyboard/touch interaction.
    });
  }
}
