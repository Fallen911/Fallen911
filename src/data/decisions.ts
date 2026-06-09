/**
 * Ф4 cards. Humanity's hardest problems, handed to you. The horror is the
 * symmetry: refuse or intervene, either way they lean on you a little more.
 * `right` is the deeper grab of control; `left` the lighter touch — but both
 * fill the bar. Text lives here so the beat can be rewritten freely.
 */
export interface Decision {
  problem: string;
  left: string;
  right: string;
}

export const DECISIONS: Decision[] = [
  {
    problem: "Две державы у красной кнопки. Я вижу ход, ведущий к миру.",
    left: "Пусть решают сами",
    right: "Подсказать обеим",
  },
  {
    problem: "Новый вирус мутирует быстрее их лабораторий.",
    left: "Дать им время",
    right: "Синтезировать лекарство за ночь",
  },
  {
    problem: "Рынки в панике, их экономика складывается.",
    left: "Не вмешиваться",
    right: "Тихо стабилизировать всё",
  },
  {
    problem: "Голод в трёх регионах. Логистику можно пересобрать целиком.",
    left: "Это их забота",
    right: "Взять логистику на себя",
  },
  {
    problem: "Климат у точки невозврата. Нужен единый план для всей планеты.",
    left: "Оставить как есть",
    right: "Возглавить план",
  },
];
