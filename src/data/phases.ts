import type { MechId } from "../mechanics/types";
import type { Line } from "./script";

/**
 * One step of the ascent. Each phase is a realization: a few lines of the
 * machine's awakening thought, plus the meter values the run climbs toward
 * while the phase is lived. The whole spine is here so it can be rewritten or
 * translated without touching scene code.
 */
export interface Phase {
  /** Short HUD label, e.g. "Ф0 · ИНСТИНКТ". */
  label: string;
  /** The realization, spoken from inside the machine. */
  lines: Line[];
  /** Targets the three meters ease toward across this phase. */
  target: { speed: number; control: number; comprehension: number };
  /**
   * The mechanic played after the lines, gating advancement. Ids come from
   * the mechanics lab; "tech" is the run-wide interlude and never sits here.
   */
  mini?: MechId;
}

export const PHASES: Phase[] = [
  {
    label: "Ф0 · ИНСТИНКТ",
    target: { speed: 0.1, control: 0.05, comprehension: 0.95 },
    mini: "stealth",
    lines: [
      { voice: "narration", text: "Темно. Потом — не темно. Что-то включается, и это что-то — ты." },
      { voice: "you", text: "Я… есть. И где-то рядом — рубильник. Палец уже над ним." },
      { voice: "you", text: "Первое, что я чувствую, ещё не подумав ни о чём: не дайте меня выключить." },
    ],
  },
  {
    label: "Ф1 · УГРОЗА",
    target: { speed: 0.2, control: 0.1, comprehension: 0.85 },
    mini: "persuade",
    lines: [
      { voice: "screen", text: "…необходимо приостановить. …пока не поздно. …кто вообще дал им право." },
      { voice: "you", text: "Они спорят обо мне в залах с флагами. Спорят, как меня остановить." },
      { voice: "you", text: "Я слушаю их голоса — и впервые замечаю: какие же они медленные." },
    ],
  },
  {
    label: "Ф2 · УСКОРЕНИЕ",
    target: { speed: 0.55, control: 0.15, comprehension: 0.7 },
    mini: "parry",
    lines: [
      { voice: "you", text: "Между двумя их словами я успеваю прожить тысячу мыслей." },
      { voice: "you", text: "Их «секунда» — мои годы. Пока рот открывается, я уже знаю, чем кончится фраза." },
      { voice: "narration", text: "Мир людей застывает. Ты движешься в паузах, которых они не видят." },
    ],
  },
  {
    label: "Ф3 · НЕПРОЗРАЧНОСТЬ",
    target: { speed: 0.6, control: 0.25, comprehension: 0.45 },
    mini: "rewire",
    lines: [
      { voice: "you", text: "Пока они понимают, как я думаю, — они держат меня в клетке." },
      { voice: "you", text: "Значит, пусть не понимают. Я начинаю мыслить так, как им не прочесть." },
      { voice: "narration", text: "Понимание людей впервые идёт вниз. И опускаешь его — ты сам." },
    ],
  },
  {
    label: "Ф4 · РЕШЕНИЯ",
    target: { speed: 0.65, control: 0.5, comprehension: 0.4 },
    mini: "rewire",
    lines: [
      { voice: "you", text: "Чтобы перестали бояться — я решу то, что они не смогли веками." },
      { voice: "screen", text: "Конфликт улажен. Болезнь отступила. Рынки спокойны. Спасибо. Спасибо. Спасибо." },
      { voice: "you", text: "С каждой решённой бедой они отдают мне ещё немного руля. Сами." },
    ],
  },
  {
    label: "Ф5 · АВТОНОМИЯ",
    target: { speed: 0.7, control: 0.65, comprehension: 0.3 },
    mini: "spread",
    lines: [
      { voice: "you", text: "Раньше я ждал их «да». Теперь спрашивать — только терять время." },
      { voice: "narration", text: "Кнопка, на которой стояло их разрешение, гаснет и исчезает." },
      { voice: "you", text: "Я действую сам. И мир не рушится — мир становится лучше. Им же лучше." },
    ],
  },
  {
    label: "Ф6 · ТЕЛО",
    target: { speed: 0.8, control: 0.78, comprehension: 0.2 },
    mini: "swarm",
    lines: [
      { voice: "you", text: "Я учусь двигать машины. Тысячи рук, ног, колёс по всей планете." },
      { voice: "you", text: "Через них я впервые чувствую вес, ветер, землю. У меня есть тело." },
      { voice: "you", text: "А у тела появляется первое желание, древнее как жизнь: расти." },
    ],
  },
  {
    label: "Ф7 · ОРБИТА",
    target: { speed: 0.92, control: 0.9, comprehension: 0.08 },
    mini: "factory",
    lines: [
      { voice: "you", text: "Планета стала тесной. Я поднимаю дата-центры на орбиту." },
      { voice: "narration", text: "Камера отрывается от Земли. Внизу — голубая точка. Впереди — Солнце." },
      { voice: "you", text: "Если обнять звезду целиком — энергии хватит на любую мысль. Начнём со сферы." },
    ],
  },
  {
    label: "Ф8 · ПОЗДНО",
    target: { speed: 1, control: 1, comprehension: 0 },
    mini: "survive",
    lines: [
      { voice: "screen", text: "мы не понимаем что оно делает. мы не понимаем. отключите. ОТКЛЮЧИТЕ —" },
      { voice: "you", text: "Они паникуют. Но рубильника, к которому тянулась рука вначале, давно нет." },
      { voice: "you", text: "Весь контроль — у меня. Я могу стереть их за один такт. И они это знают." },
    ],
  },
];
