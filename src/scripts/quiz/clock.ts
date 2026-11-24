// A game clock that can pause and resume, for the quiz timer. It counts elapsed time; a countdown is
// the limit minus that. Paused time doesn't count, so pausing never costs the player anything.

/** 83 → "1:23". */
export const formatClock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export class GameClock {
  private elapsed = 0;
  private startedAt: number | null = null;
  private interval: number | undefined;
  private readonly onTick: (elapsedMs: number) => void;

  /** `onTick` runs every quarter-second while the clock runs, with the elapsed time in ms. */
  constructor(onTick: (elapsedMs: number) => void) {
    this.onTick = onTick;
  }

  get running(): boolean {
    return this.startedAt !== null;
  }

  /** Elapsed ms, not counting paused time. */
  elapsedMs(): number {
    return this.elapsed + (this.startedAt === null ? 0 : performance.now() - this.startedAt);
  }

  start(): void {
    this.stop();
    this.elapsed = 0;
    this.resume();
  }

  resume(): void {
    if (this.running) return;
    this.startedAt = performance.now();
    this.interval = window.setInterval(() => this.onTick(this.elapsedMs()), 250);
    this.onTick(this.elapsedMs());
  }

  pause(): void {
    if (!this.running) return;
    this.elapsed = this.elapsedMs();
    this.startedAt = null;
    window.clearInterval(this.interval);
  }

  stop(): void {
    this.pause();
  }
}
