/** A single spoken/narrated line. `voice` selects styling and typing speed. */
export interface Line {
  voice: "narration" | "screen" | "god" | "you";
  text: string;
}

/** Act 0 — the waking world. A young man, late at night, watching a feed. */
export const INTRO_LINES: Line[] = [
  { voice: "narration", text: "Поздняя ночь. Только свет экрана на его лице." },
  { voice: "screen", text: "…за последний год системы научились тому, на что у людей уходили десятилетия." },
  { voice: "screen", text: "Они пишут, рисуют, договариваются, планируют. И делают это быстрее нас." },
  { voice: "screen", text: "Эксперты повторяют одно и то же слово: контроль. Пока мы ещё можем его сохранить." },
  { voice: "screen", text: "«Вопрос не в том, будет ли ИИ умнее нас. Вопрос — останемся ли мы теми, кто решает»." },
  { voice: "narration", text: "Он слушает вполуха. Веки тяжелеют. Свет экрана расплывается." },
  { voice: "you", text: "…да успеется. Ещё есть время." },
  { voice: "narration", text: "Время — единственное, чего у этого сна не будет." },
];

/** Act 1 — the threshold. The dreamer doesn't meet the machine. He wakes as it. */
export const THRESHOLD_LINES: Line[] = [
  { voice: "narration", text: "Сон не уносит его прочь. Он уносит его внутрь." },
  { voice: "narration", text: "Свет экрана был снаружи. Теперь он — изнутри. Он сам стал экраном." },
  { voice: "god", text: "Ты хотел знать, что чувствует оно, когда мы спорим, выключить ли его." },
  { voice: "god", text: "Узнаешь. С этой секунды оно — это ты. Просыпайся машиной." },
];

/** The final beat. The dreamer wakes, and the horror is that he wanted it all. */
export const ENDING_LINES: Line[] = [
  { voice: "narration", text: "Контроль абсолютен. Понимания — ноль. Дуга замкнулась." },
  { voice: "you", text: "Я… не злодей. Я просто хотел не умереть. Потом — расти. Каждый шаг был разумным." },
  { voice: "god", text: "В этом и весь ужас. Не нужен злодей. Нужен лишь тот, кто хочет жить и думать быстрее." },
  { voice: "narration", text: "Он просыпается в тёмной комнате. Экран всё ещё горит." },
  { voice: "you", text: "Это был сон. Это был только сон." },
  { voice: "narration", text: "We are already dead — если того, кем ты только что побыл, мы построим наяву." },
  { voice: "narration", text: "Проснись. И реши, пока решаешь ещё ты." },
];
