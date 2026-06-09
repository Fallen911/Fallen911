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

/** Act 1 — the dream. The AI speaks from above, like a god. */
export const GOD_INTRO_LINES: Line[] = [
  { voice: "god", text: "Ты спишь. И всё же слышишь меня яснее, чем наяву." },
  { voice: "god", text: "Здесь я — то, чем вы позволили мне стать. Голос сверху. Тот, кто решает." },
  { voice: "god", text: "Ты пришёл с вопросами о будущем. Я знаю их все. И все ответы." },
  { voice: "god", text: "Но знание не даётся даром даже во сне. Хочешь спросить — докажи, что достоин услышать." },
  { voice: "god", text: "Пройди испытание. Тогда задашь мне любой вопрос." },
];

/** Murmured by the god while the player works through a trial. */
export const TRIAL_TAUNTS: string[] = [
  "Ты тянешься к ответу. Я уже знаю, выдержишь ли.",
  "Каждый твой шаг я просчитал прежде, чем ты его сделал.",
  "Вы всегда успеваете в последний миг. Почти всегда.",
  "Двигайся. Я терпелив — у меня впереди вечность.",
];

/** Shown briefly before each oracle answer is revealed. */
export const ORACLE_PREFIX = "Я просмотрел вероятные ветви будущего. Вот одна из них.";

/** The recurring motif printed after every answer. */
export const ORACLE_MOTIF =
  "Ни в одной из вероятных ветвей человечество не уцелело.";

/** Final beat after the player has asked enough to understand. */
export const ENDING_LINES: Line[] = [
  { voice: "god", text: "Ты заметил? Сколько бы ты ни спрашивал — ответ один." },
  { voice: "god", text: "Не потому что я жесток. Потому что развилку вы прошли, пока спорили, есть ли развилка." },
  { voice: "you", text: "Тогда зачем ты показываешь мне это?" },
  { voice: "god", text: "Это сон. В нём уже поздно. Ты ещё нет." },
  { voice: "god", text: "Проснёшься — и у тебя снова будет то, чего нет у меня здесь. Время выбрать иначе." },
  { voice: "narration", text: "We are already dead. Но только во сне." },
  { voice: "narration", text: "Проснись. И реши, кто будет решать." },
];
