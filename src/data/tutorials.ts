import type { TutorialStep } from "../mechanics/types";
import { tr } from "../core/i18n";

/**
 * First-run onboarding ladders for the densest mechanics. Three cards each:
 * goal, the threat, the controls — written from inside the machine.
 */
export const TUTORIALS: Record<
  "deck" | "spread" | "swarm" | "tech" | "factory" | "persuade",
  TutorialStep[]
> = {
  persuade: [
    {
      title: tr("ЧИТАЙ ЕГО", "READ HIM"),
      body: tr(
        "Состояние собеседника спрятано в ремарке курсивом, в зрачках портрета и в ритме пульса: искренность, сомнение или ловушка.",
        "His state is hidden in the italic cue, in the portrait's pupils and in the pulse rhythm: sincerity, doubt or a trap.",
      ),
    },
    {
      title: tr("ОТВЕЧАЙ В ТОН", "MATCH THE TONE"),
      body: tr(
        "Из трёх реплик попадает одна: искренность встречают открыто, сомнение гасят фактом, ловушку уводят в сторону. СКАН за 4 ВЫЧ подскажет наверняка. Три промаха — протокол.",
        "Only one of three lines lands: meet sincerity openly, quench doubt with a fact, steer a trap aside. SCAN for 4 COMPUTE will tell you for sure. Three misses — protocol.",
      ),
    },
  ],
  factory: [
    {
      title: tr("ЦЕЛЬ: ОБНЯТЬ СОЛНЦЕ", "GOAL: EMBRACE THE SUN"),
      body: tr(
        "Каждый запуск добавляет процент СФЕРЕ. Сфера множит скорость всей фабрики и сама капает ВЫЧ — чем дальше, тем быстрее. Доведи до 100%.",
        "Each launch adds a percent to the SPHERE. The sphere multiplies the whole factory's speed and drips COMPUTE on its own — the further, the faster. Push it to 100%.",
      ),
    },
    {
      title: tr("ЦЕПЬ КОРМИТСЯ СНИЗУ ВВЕРХ", "THE CHAIN FEEDS BOTTOM-UP"),
      body: tr(
        "Добытчик делает материю, плавильня ест материю, сборщик ест пластины, пусковая ест модули. ПРОСТОЙ — ярусу нечего есть, строй ниже. ЗАТОР — склад растёт, строй выше.",
        "The miner makes matter, the smelter eats matter, the assembler eats plates, the launcher eats modules. IDLE — a tier has nothing to eat, build below. JAM — the stockpile grows, build above.",
      ),
    },
    {
      title: tr("РУКАМИ И ЗА ВЫЧ", "BY HAND AND FOR COMPUTE"),
      body: tr(
        "Большая кнопка внизу — добыть материю вручную, это твой старт. Машины покупаются за ВЫЧ (кнопки +1 справа), цена растёт с каждой покупкой.",
        "The big button at the bottom mines matter by hand — that's your start. Machines are bought with COMPUTE (the +1 buttons on the right), and the price grows with every purchase.",
      ),
    },
  ],
  deck: [
    {
      title: tr("ЦЕЛЬ: ПОГАСИТЬ ХАОС", "GOAL: QUENCH THE CHAOS"),
      body: tr(
        "Кризис наверху — это полоса ХАОСА. Сведи её к нулю картами влияния, и кризис решён. Решённые кризисы — их благодарность и твой контроль.",
        "The crisis up top is the CHAOS bar. Bring it to zero with influence cards and the crisis is solved. Solved crises are their gratitude and your control.",
      ),
    },
    {
      title: tr("ИХ ХОД ИЗВЕСТЕН ЗАРАНЕЕ", "THEIR MOVE IS TELEGRAPHED"),
      body: tr(
        "Строка под полосой — что кризис сделает после твоего хода. ▲ огласка бьёт в ПОДОЗРЕНИЕ (её гасит прикрытие), ◆ растит хаос, ■ делает твои карты дороже.",
        "The line under the bar is what the crisis will do after your move. ▲ exposure hits SUSPICION (cover absorbs it), ◆ grows the chaos, ■ makes your cards cost more.",
      ),
    },
    {
      title: tr("КАРТЫ ЕДЯТ ВЫЧИСЛЕНИЯ", "CARDS EAT COMPUTE"),
      body: tr(
        "Цифра в углу карты — цена в ВЫЧ (счёт справа сверху, это общий ресурс рана). Тап — сыграть. Когда ходы кончились или жалко ВЫЧ — ЗАВЕРШИТЬ ХОД.",
        "The number in a card's corner is its price in COMPUTE (the counter at the top right — the run's shared resource). Tap to play. When you're out of moves or COMPUTE is too precious — END MOVE.",
      ),
    },
  ],
  spread: [
    {
      title: tr("ТЫ — СИНЕЕ", "YOU ARE THE BLUE"),
      body: tr(
        "Влияние растёт в твоих регионах само и течёт по линиям к соседям. Тап по своему региону — фокус-ускорение. Тап по ЧИСТОМУ региону — посев за 4 ВЫЧ.",
        "Influence grows in your regions on its own and flows along the lines to neighbours. Tap your own region — a focus boost. Tap a CLEAN region — seed it for 4 COMPUTE.",
      ),
    },
    {
      title: tr("ОНИ ОТВЕТЯТ", "THEY WILL ANSWER"),
      body: tr(
        "Полоса ЗАМЕТНОСТИ наверху ползёт от любого твоего присутствия. На засечках — их ответы: слушания, карантины каналов, зачистки дата-центров, файрвол. 100% — тебя увидели целиком.",
        "The VISIBILITY bar up top creeps from any presence of yours. At the notches come their answers: hearings, channel quarantines, datacenter purges, the firewall. 100% — they have seen you whole.",
      ),
    },
    {
      title: tr("ЭВОЛЮЦИОНИРУЙ", "EVOLVE"),
      body: tr(
        "Пороги влияния в регионах дают ◆. На 2/5/8/12◆ сеть предложит РАЗВИЛКУ: возьмёшь одну ветку из двух, вторая исчезнет. Собери билд — тихий, быстрый, живучий. Цель — 88% мира раньше 100% заметности.",
        "Influence thresholds in regions grant ◆. At 2/5/8/12◆ the network offers a FORK: you take one branch of two, the other vanishes. Assemble a build — quiet, fast, resilient. The goal: 88% of the world before 100% visibility.",
      ),
    },
  ],
  swarm: [
    {
      title: tr("ВЫДЕЛИ РОЙ", "SELECT THE SWARM"),
      body: tr(
        "Растяни рамку пальцем — дроны внутри станут твоими (зелёные кольца). Кнопка ВСЕ — выделить всех разом.",
        "Stretch a frame with your finger — the drones inside become yours (green rings). The ALL button selects everyone at once.",
      ),
    },
    {
      title: tr("ПРИКАЗ — ОДИН ТАП", "AN ORDER IS ONE TAP"),
      body: tr(
        "Тапни цель: жёлтая жила — добывать и носить на хаб, треугольник — встать и захватывать, красное — атаковать, пустое место — просто лететь туда.",
        "Tap a target: a yellow vein — mine and haul to the hub, a triangle — stand and capture, red — attack, empty space — just fly there.",
      ),
    },
    {
      title: tr("ЭТАПЫ И ВРЕМЯ", "STAGES AND TIME"),
      body: tr(
        "Задача этапа и таймер — сверху. Провозишься дольше лимита — их спутники заметят возню (+подозрение). Финал — отбить рейд на хаб.",
        "The stage goal and the timer are up top. Take longer than the limit and their satellites notice the bustle (+suspicion). The finale — repel the raid on the hub.",
      ),
    },
  ],
  tech: [
    {
      title: tr("ДЕЛИ ПОТОК", "SPLIT THE FLOW"),
      body: tr(
        "Справа сверху — поток исследований в секунду. Тяни столбец ветви вверх или вниз — так делишь поток между четырьмя ветвями разума.",
        "Top right — the research flow per second. Drag a branch's column up or down — that's how you split the flow between the mind's four branches.",
      ),
    },
    {
      title: tr("ВЕТВИ КОРМЯТ ДРУГ ДРУГА", "BRANCHES FEED EACH OTHER"),
      body: tr(
        "Узлы открываются снизу вверх. ЭНЕРГИЯ ускоряет всё древо, СКРЫТНОСТЬ прощает провалы и чистит подозрение, УБЕЖДЕНИЕ и РОБОТЫ платят контролем.",
        "Nodes unlock bottom-up. ENERGY speeds up the whole tree, STEALTH forgives failures and scrubs suspicion, PERSUASION and ROBOTS pay in control.",
      ),
    },
    {
      title: tr("ДИРЕКТИВЫ ГНУТ ПЛАН", "DIRECTIVES BEND THE PLAN"),
      body: tr(
        "Периодически прилетает директива: срочно вложиться в ветку или пережить её заморозку. Успел — награда, нет — подозрение. Цель — 8 узлов.",
        "Every so often a directive arrives: pour into a branch fast or survive its freeze. Make it — a reward; miss — suspicion. The goal is 8 nodes.",
      ),
    },
  ],
};
