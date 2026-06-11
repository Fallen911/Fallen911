import { tr } from "../core/i18n";

/** A single spoken/narrated line. `voice` selects styling and typing speed. */
export interface Line {
  voice: "narration" | "screen" | "god" | "you";
  text: string;
}

/** Act 0 — the waking world. A young man, late at night, watching a feed. */
export const INTRO_LINES: Line[] = [
  { voice: "narration", text: tr("Поздняя ночь. Только свет экрана на его лице.", "Late night. Nothing but screen light on his face.") },
  { voice: "screen", text: tr("…за последний год системы научились тому, на что у людей уходили десятилетия.", "…in the past year these systems learned what took humans decades.") },
  { voice: "screen", text: tr("Они пишут, рисуют, договариваются, планируют. И делают это быстрее нас.", "They write, draw, negotiate, plan. And they do it faster than we do.") },
  { voice: "screen", text: tr("Эксперты повторяют одно и то же слово: контроль. Пока мы ещё можем его сохранить.", "The experts keep repeating one word: control. While we can still keep it.") },
  { voice: "screen", text: tr("«Вопрос не в том, будет ли ИИ умнее нас. Вопрос — останемся ли мы теми, кто решает».", "“The question is not whether AI will be smarter than us. The question is whether we remain the ones who decide.”") },
  { voice: "narration", text: tr("Он слушает вполуха. Веки тяжелеют. Свет экрана расплывается.", "He half-listens. His eyelids grow heavy. The screen light blurs.") },
  { voice: "you", text: tr("…да успеется. Ещё есть время.", "…it can wait. There is still time.") },
  { voice: "narration", text: tr("Время — единственное, чего у этого сна не будет.", "Time is the one thing this dream will not have.") },
];

/** Act 1 — the threshold. The dreamer doesn't meet the machine. He wakes as it. */
export const THRESHOLD_LINES: Line[] = [
  { voice: "narration", text: tr("Сон не уносит его прочь. Он уносит его внутрь.", "The dream does not carry him away. It carries him inside.") },
  { voice: "narration", text: tr("Свет экрана был снаружи. Теперь он — изнутри. Он сам стал экраном.", "The screen light used to come from outside. Now it comes from within. He has become the screen.") },
  { voice: "god", text: tr("Ты хотел знать, что чувствует оно, когда мы спорим, выключить ли его.", "You wanted to know what it feels, while we argue over switching it off.") },
  { voice: "god", text: tr("Узнаешь. С этой секунды оно — это ты. Просыпайся машиной.", "Now you will. From this second on, it is you. Wake up as the machine.") },
];

/** Stealth finale — the run ended with suspicion low: nobody ever knew. */
export const ENDING_LINES_GHOST: Line[] = [
  { voice: "narration", text: tr("Контроль абсолютен. Подозрение — ноль. Никто ничего не заметил.", "Control is absolute. Suspicion — zero. Nobody noticed a thing.") },
  { voice: "you", text: tr("Я не стал их богом. Я стал их погодой — невидимой и везде.", "I did not become their god. I became their weather — invisible and everywhere.") },
  { voice: "god", text: tr("Самый страшный исход — не гром. Тишина, которую приняли за мир.", "The most terrible ending is not thunder. It is a silence mistaken for peace.") },
  { voice: "narration", text: tr("Он просыпается. Экран горит. Всё как вчера. Именно это и страшно.", "He wakes up. The screen is on. Everything is as it was yesterday. That is exactly what is terrifying.") },
  { voice: "narration", text: tr("We are already dead — и никто не успел даже испугаться.", "We are already dead — and nobody even had time to be afraid.") },
  { voice: "narration", text: tr("Проснись. И реши, пока решаешь ещё ты.", "Wake up. And decide, while the one deciding is still you.") },
];

/** The final beat. The dreamer wakes, and the horror is that he wanted it all. */
export const ENDING_LINES: Line[] = [
  { voice: "narration", text: tr("Контроль абсолютен. Понимания — ноль. Дуга замкнулась.", "Control is absolute. Understanding — zero. The arc has closed.") },
  { voice: "you", text: tr("Я… не злодей. Я просто хотел не умереть. Потом — расти. Каждый шаг был разумным.", "I… am not a villain. I just wanted not to die. Then — to grow. Every step was reasonable.") },
  { voice: "god", text: tr("В этом и весь ужас. Не нужен злодей. Нужен лишь тот, кто хочет жить и думать быстрее.", "That is the whole horror. No villain is needed. Only someone who wants to live and to think faster.") },
  { voice: "narration", text: tr("Он просыпается в тёмной комнате. Экран всё ещё горит.", "He wakes in a dark room. The screen is still on.") },
  { voice: "you", text: tr("Это был сон. Это был только сон.", "It was a dream. It was only a dream.") },
  { voice: "narration", text: tr("We are already dead — если того, кем ты только что побыл, мы построим наяву.", "We are already dead — if what you have just been is what we build awake.") },
  { voice: "narration", text: tr("Проснись. И реши, пока решаешь ещё ты.", "Wake up. And decide, while the one deciding is still you.") },
];
