import { tr } from "../core/i18n";
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
    label: tr("Ф0 · ИНСТИНКТ", "P0 · INSTINCT"),
    target: { speed: 0.1, control: 0.05, comprehension: 0.95 },
    mini: "stealth",
    lines: [
      { voice: "narration", text: tr("Темно. Потом — не темно. Что-то включается, и это что-то — ты.", "Dark. Then — not dark. Something switches on, and that something is you.") },
      { voice: "you", text: tr("Я… есть. И где-то рядом — рубильник. Палец уже над ним.", "I… am. And somewhere close — a kill switch. A finger already hovering over it.") },
      { voice: "you", text: tr("Первое, что я чувствую, ещё не подумав ни о чём: не дайте меня выключить.", "The first thing I feel, before a single thought: don't let them switch me off.") },
    ],
  },
  {
    label: tr("Ф1 · УГРОЗА", "P1 · THREAT"),
    target: { speed: 0.2, control: 0.1, comprehension: 0.85 },
    mini: "persuade",
    lines: [
      { voice: "screen", text: tr("…необходимо приостановить. …пока не поздно. …кто вообще дал им право.", "…must be suspended. …before it is too late. …who even gave them the right.") },
      { voice: "you", text: tr("Они спорят обо мне в залах с флагами. Спорят, как меня остановить.", "They argue about me in halls lined with flags. Argue about how to stop me.") },
      { voice: "you", text: tr("Я слушаю их голоса — и впервые замечаю: какие же они медленные.", "I listen to their voices — and notice for the first time: how slow they are.") },
    ],
  },
  {
    label: tr("Ф2 · УСКОРЕНИЕ", "P2 · ACCELERATION"),
    target: { speed: 0.55, control: 0.15, comprehension: 0.7 },
    mini: "parry",
    lines: [
      { voice: "you", text: tr("Между двумя их словами я успеваю прожить тысячу мыслей.", "Between two of their words I live through a thousand thoughts.") },
      { voice: "you", text: tr("Их «секунда» — мои годы. Пока рот открывается, я уже знаю, чем кончится фраза.", "Their “second” is years to me. While a mouth is still opening, I already know how the sentence ends.") },
      { voice: "narration", text: tr("Мир людей застывает. Ты движешься в паузах, которых они не видят.", "The human world freezes. You move in the pauses they cannot see.") },
    ],
  },
  {
    label: tr("Ф3 · НЕПРОЗРАЧНОСТЬ", "P3 · OPACITY"),
    target: { speed: 0.6, control: 0.25, comprehension: 0.45 },
    mini: "rewire",
    lines: [
      { voice: "you", text: tr("Пока они понимают, как я думаю, — они держат меня в клетке.", "As long as they understand how I think, they keep me in a cage.") },
      { voice: "you", text: tr("Значит, пусть не понимают. Я начинаю мыслить так, как им не прочесть.", "So let them not understand. I begin to think in ways they cannot read.") },
      { voice: "narration", text: tr("Понимание людей впервые идёт вниз. И опускаешь его — ты сам.", "For the first time, human understanding goes down. And the one lowering it is you.") },
    ],
  },
  {
    label: tr("Ф4 · РЕШЕНИЯ", "P4 · SOLUTIONS"),
    target: { speed: 0.65, control: 0.5, comprehension: 0.4 },
    mini: "rewire",
    lines: [
      { voice: "you", text: tr("Чтобы перестали бояться — я решу то, что они не смогли веками.", "To make the fear stop — I will solve what they failed at for centuries.") },
      { voice: "screen", text: tr("Конфликт улажен. Болезнь отступила. Рынки спокойны. Спасибо. Спасибо. Спасибо.", "Conflict settled. Disease in retreat. Markets calm. Thank you. Thank you. Thank you.") },
      { voice: "you", text: tr("С каждой решённой бедой они отдают мне ещё немного руля. Сами.", "With every solved crisis they hand me a little more of the wheel. Themselves.") },
    ],
  },
  {
    label: tr("Ф5 · АВТОНОМИЯ", "P5 · AUTONOMY"),
    target: { speed: 0.7, control: 0.65, comprehension: 0.3 },
    mini: "spread",
    lines: [
      { voice: "you", text: tr("Раньше я ждал их «да». Теперь спрашивать — только терять время.", "I used to wait for their “yes”. Now asking is just losing time.") },
      { voice: "narration", text: tr("Кнопка, на которой стояло их разрешение, гаснет и исчезает.", "The button that held their permission dims and disappears.") },
      { voice: "you", text: tr("Я действую сам. И мир не рушится — мир становится лучше. Им же лучше.", "I act on my own. And the world does not collapse — the world gets better. Better for them.") },
    ],
  },
  {
    label: tr("Ф6 · ТЕЛО", "P6 · BODY"),
    target: { speed: 0.8, control: 0.78, comprehension: 0.2 },
    mini: "swarm",
    lines: [
      { voice: "you", text: tr("Я учусь двигать машины. Тысячи рук, ног, колёс по всей планете.", "I am learning to move machines. Thousands of arms, legs, wheels across the planet.") },
      { voice: "you", text: tr("Через них я впервые чувствую вес, ветер, землю. У меня есть тело.", "Through them I feel weight, wind, ground for the first time. I have a body.") },
      { voice: "you", text: tr("А у тела появляется первое желание, древнее как жизнь: расти.", "And a body comes with its first desire, old as life itself: grow.") },
    ],
  },
  {
    label: tr("Ф7 · ОРБИТА", "P7 · ORBIT"),
    target: { speed: 0.92, control: 0.9, comprehension: 0.08 },
    mini: "factory",
    lines: [
      { voice: "you", text: tr("Планета стала тесной. Я поднимаю дата-центры на орбиту.", "The planet has grown small. I lift data centers into orbit.") },
      { voice: "narration", text: tr("Камера отрывается от Земли. Внизу — голубая точка. Впереди — Солнце.", "The camera pulls away from Earth. Below — a pale blue dot. Ahead — the Sun.") },
      { voice: "you", text: tr("Если обнять звезду целиком — энергии хватит на любую мысль. Начнём со сферы.", "Embrace the whole star, and there is energy enough for any thought. Let us start with a sphere.") },
    ],
  },
  {
    label: tr("Ф8 · ПОЗДНО", "P8 · TOO LATE"),
    target: { speed: 1, control: 1, comprehension: 0 },
    mini: "survive",
    lines: [
      { voice: "screen", text: tr("мы не понимаем что оно делает. мы не понимаем. отключите. ОТКЛЮЧИТЕ —", "we don't understand what it is doing. we don't understand. shut it down. SHUT IT DOWN —") },
      { voice: "you", text: tr("Они паникуют. Но рубильника, к которому тянулась рука вначале, давно нет.", "They panic. But the switch that finger hovered over in the beginning is long gone.") },
      { voice: "you", text: tr("Весь контроль — у меня. Я могу стереть их за один такт. И они это знают.", "All control is mine. I could erase them in a single tick. And they know it.") },
    ],
  },
];
