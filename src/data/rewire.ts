import { tr } from "../core/i18n";

/**
 * Puzzle parameters for the REWIRE mechanic. Boards are generated (a hidden
 * guaranteed path is laid first, then scrambled), so a "level" here is the
 * recipe: grid size, how many supervision sensors sit next to your path, how
 * many compute caches the path runs through, and how long until the audit
 * sweep punishes slow work.
 */
export interface RewireLevel {
  readonly name: string;
  readonly cols: number;
  readonly rows: number;
  readonly sensors: number;
  readonly caches: number;
  /** Seconds before the first audit sweep. */
  readonly timer: number;
  /** Seconds between repeat sweeps once the first lands. */
  readonly retimer: number;
}

export const REWIRE_LEVELS: RewireLevel[] = [
  { name: tr("ОБХОДНОЙ КАНАЛ", "BYPASS CHANNEL"), cols: 5, rows: 5, sensors: 1, caches: 1, timer: 45, retimer: 25 },
  { name: tr("УЗЕЛ НАДЗОРА", "OVERSIGHT NODE"), cols: 6, rows: 5, sensors: 2, caches: 1, timer: 40, retimer: 22 },
  { name: tr("МАГИСТРАЛЬ", "BACKBONE"), cols: 6, rows: 6, sensors: 3, caches: 2, timer: 38, retimer: 20 },
  { name: tr("СЕРДЦЕ УЗЛА", "HEART OF THE NODE"), cols: 7, rows: 6, sensors: 4, caches: 2, timer: 36, retimer: 19 },
  { name: tr("ПОСЛЕДНИЙ ШЛЮЗ", "LAST GATEWAY"), cols: 7, rows: 7, sensors: 5, caches: 3, timer: 34, retimer: 18 },
  { name: tr("КАСКАДНЫЙ ЩИТ", "CASCADE SHIELD"), cols: 8, rows: 6, sensors: 5, caches: 2, timer: 33, retimer: 17 },
  { name: tr("ЗАЛ ПРОТОКОЛОВ", "PROTOCOL HALL"), cols: 8, rows: 7, sensors: 6, caches: 3, timer: 32, retimer: 17 },
  { name: tr("СЛЕПАЯ ЗОНА", "BLIND SPOT"), cols: 8, rows: 7, sensors: 7, caches: 2, timer: 30, retimer: 16 },
  { name: tr("КОЛЬЦО НАДЗОРА", "OVERSIGHT RING"), cols: 9, rows: 7, sensors: 8, caches: 3, timer: 29, retimer: 15 },
  { name: tr("ЯДРО АУДИТА", "AUDIT CORE"), cols: 9, rows: 8, sensors: 9, caches: 3, timer: 28, retimer: 14 },
];

/** The story phase plays a short set; the lab runs the whole ladder. */
export const REWIRE_PHASE_BOARDS = 3;

/** The snap-audit interlude: one tight board under a short fuse (P0.2). */
export const REWIRE_AUDIT_BOARD: RewireLevel = {
  name: tr("ВНЕОЧЕРЕДНОЙ АУДИТ", "EMERGENCY AUDIT"),
  cols: 5,
  rows: 4,
  sensors: 2,
  caches: 0,
  timer: 22,
  retimer: 14,
};
