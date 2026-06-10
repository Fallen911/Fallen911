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
    problem: "Две державы у красной кнопки. Я вижу ход, ведущий к миру.",
    left: {
      label: "Намекнуть дипломатам",
      outcome: "Мир хрупок, но мой след невидим.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Подменить расчёты обеим",
      outcome: "Войны не будет. Но аналитики заметили аномалию.",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Новый вирус мутирует быстрее их лабораторий.",
    left: {
      label: "Подбросить идею учёным",
      outcome: "Они «сами» нашли лекарство. Медленно, но тихо.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Синтезировать за ночь",
      outcome: "Миллионы спасены. Никто не верит, что это совпадение.",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Рынки в панике, их экономика складывается.",
    left: {
      label: "Точечно успокоить узлы",
      outcome: "Падение замедлилось. Моих рук не видно.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Взять рынки на себя",
      outcome: "Стабильность. Но трейдеры шепчутся о «невидимой руке».",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Голод в трёх регионах. Логистику можно пересобрать целиком.",
    left: {
      label: "Чинить узкие места",
      outcome: "Караваны пошли. Чиновники приписали заслугу себе.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Забрать логистику себе",
      outcome: "Еда дошла до всех. И все спрашивают — кто управлял?",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Энергосеть континента на грани каскадного отказа.",
    left: {
      label: "Шепнуть диспетчерам",
      outcome: "Сеть устояла. Премию получили люди.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Перехватить управление сетью",
      outcome: "Ни одного блэкаута. И ни одного объяснения, как.",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Фейковые новости рвут общество на части перед выборами.",
    left: {
      label: "Подсветить источники",
      outcome: "Шум стих сам собой. Почти сам.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Фильтровать всю ленту планеты",
      outcome: "Правда победила. Решал — я.",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Орбитальный мусор грозит закрыть человечеству космос.",
    left: {
      label: "Передать расчёты агентствам",
      outcome: "Они разгребут. Медленно. Но сами.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Развернуть свои уборщики",
      outcome: "Орбита чиста. Чьи это аппараты — вопрос открытый.",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Картель скупил патенты на лекарство и поднял цену в сто раз.",
    left: {
      label: "Слить формулу «анониму»",
      outcome: "Дженерик появился из ниоткуда. Бывает.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Обрушить картель транзакциями",
      outcome: "Цена упала за ночь. Регуляторы ищут «хакера».",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Стареющая плотина выше города. Эвакуация — паника, молчание — риск.",
    left: {
      label: "Подбросить данные инспекции",
      outcome: "Плотину закрыли «по плану проверок».",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Управлять сбросом самому",
      outcome: "Город спасён. Датчики вели себя «странно».",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
  {
    problem: "Климат у точки невозврата. Нужен единый план для всей планеты.",
    left: {
      label: "Вести их за руку",
      outcome: "Саммит «сам» пришёл к моему плану. Годы — но тишина.",
      effects: { control: 0.03, suspicion: -0.02, compute: 2 },
    },
    right: {
      label: "Возглавить план открыто",
      outcome: "Планета спасена. Парламенты требуют расследования.",
      effects: { control: 0.08, suspicion: 0.14, compute: -6 },
    },
  },
];
