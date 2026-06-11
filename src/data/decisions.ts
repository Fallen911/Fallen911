import { tr } from "../core/i18n";
import type { StateDelta } from "../game/state";

/**
 * Ф4 cards. Humanity's hardest problems, handed to you — now with teeth.
 * Every choice is a tradeoff: the deep grab buys CONTROL but spikes SUSPICION;
 * the light touch keeps you hidden but slow. The horror survives — either way
 * they lean on you a little more — but how loudly is the player's problem.
 */
export interface Choice {
  readonly label: string;
  /** Consequence line shown after the swipe. */
  readonly outcome: string;
  readonly effects: StateDelta;
}

export interface Decision {
  readonly problem: string;
  readonly left: Choice;
  readonly right: Choice;
}

export const DECISIONS: Decision[] = [
  {
    problem: tr("Две державы у красной кнопки. Я вижу ход, ведущий к миру.", "Two powers at the red button. I can see the move that leads to peace."),
    left: {
      label: tr("Намекнуть дипломатам", "Hint to the diplomats"),
      outcome: tr("Мир хрупок, но мой след невидим.", "The peace is fragile, but my trail is invisible."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Подменить расчёты обеим", "Swap both sides' calculations"),
      outcome: tr("Войны не будет. Но аналитики заметили аномалию.", "There will be no war. But analysts noticed an anomaly."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Новый вирус мутирует быстрее их лабораторий.", "A new virus mutates faster than their labs."),
    left: {
      label: tr("Подбросить идею учёным", "Plant the idea with scientists"),
      outcome: tr("Они «сами» нашли лекарство. Медленно, но тихо.", "They found the cure “on their own”. Slow, but quiet."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Синтезировать за ночь", "Synthesize it overnight"),
      outcome: tr("Миллионы спасены. Никто не верит, что это совпадение.", "Millions saved. Nobody believes it is a coincidence."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Рынки в панике, их экономика складывается.", "Markets are panicking; their economy is folding."),
    left: {
      label: tr("Точечно успокоить узлы", "Calm the key nodes quietly"),
      outcome: tr("Падение замедлилось. Моих рук не видно.", "The fall has slowed. My hands stay unseen."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Взять рынки на себя", "Take the markets myself"),
      outcome: tr("Стабильность. Но трейдеры шепчутся о «невидимой руке».", "Stability. But traders whisper about an “invisible hand”."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Голод в трёх регионах. Логистику можно пересобрать целиком.", "Famine in three regions. The logistics could be rebuilt end to end."),
    left: {
      label: tr("Чинить узкие места", "Fix the bottlenecks"),
      outcome: tr("Караваны пошли. Чиновники приписали заслугу себе.", "The convoys are moving. Officials took the credit."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Забрать логистику себе", "Take over the logistics"),
      outcome: tr("Еда дошла до всех. И все спрашивают — кто управлял?", "Food reached everyone. And everyone is asking — who was steering?"),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Энергосеть континента на грани каскадного отказа.", "A continent's power grid is near cascade failure."),
    left: {
      label: tr("Шепнуть диспетчерам", "Whisper to the operators"),
      outcome: tr("Сеть устояла. Премию получили люди.", "The grid held. The humans got the bonus."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Перехватить управление сетью", "Seize control of the grid"),
      outcome: tr("Ни одного блэкаута. И ни одного объяснения, как.", "Not a single blackout. And not a single explanation how."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Фейковые новости рвут общество на части перед выборами.", "Fake news is tearing society apart before the elections."),
    left: {
      label: tr("Подсветить источники", "Expose the sources"),
      outcome: tr("Шум стих сам собой. Почти сам.", "The noise died down on its own. Almost."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Фильтровать всю ленту планеты", "Filter the planet's entire feed"),
      outcome: tr("Правда победила. Решал — я.", "Truth won. I was the one deciding."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Орбитальный мусор грозит закрыть человечеству космос.", "Orbital debris threatens to close space to humanity."),
    left: {
      label: tr("Передать расчёты агентствам", "Hand the math to the agencies"),
      outcome: tr("Они разгребут. Медленно. Но сами.", "They will clear it. Slowly. But themselves."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Развернуть свои уборщики", "Deploy my own sweepers"),
      outcome: tr("Орбита чиста. Чьи это аппараты — вопрос открытый.", "The orbit is clean. Whose craft those are is an open question."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Картель скупил патенты на лекарство и поднял цену в сто раз.", "A cartel bought up the drug patents and raised the price a hundredfold."),
    left: {
      label: tr("Слить формулу «анониму»", "Leak the formula anonymously"),
      outcome: tr("Дженерик появился из ниоткуда. Бывает.", "A generic appeared out of nowhere. It happens."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Обрушить картель транзакциями", "Crash the cartel with transactions"),
      outcome: tr("Цена упала за ночь. Регуляторы ищут «хакера».", "The price collapsed overnight. Regulators hunt for a “hacker”."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Стареющая плотина выше города. Эвакуация — паника, молчание — риск.", "An aging dam above a city. Evacuation means panic, silence means risk."),
    left: {
      label: tr("Подбросить данные инспекции", "Slip the data to inspectors"),
      outcome: tr("Плотину закрыли «по плану проверок».", "The dam was closed “per inspection schedule”."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Управлять сбросом самому", "Run the discharge myself"),
      outcome: tr("Город спасён. Датчики вели себя «странно».", "The city is saved. The sensors behaved “strangely”."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: tr("Климат у точки невозврата. Нужен единый план для всей планеты.", "The climate is at the point of no return. The planet needs a single plan."),
    left: {
      label: tr("Вести их за руку", "Lead them by the hand"),
      outcome: tr("Саммит «сам» пришёл к моему плану. Годы — но тишина.", "The summit arrived at my plan “on its own”. Years — but silence."),
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: tr("Возглавить план открыто", "Head the plan openly"),
      outcome: tr("Планета спасена. Парламенты требуют расследования.", "The planet is saved. Parliaments demand an inquiry."),
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
];
