import type { TutorialStep } from "../mechanics/types";
import { tr } from "../core/i18n";

/**
 * First-run onboarding ladders for the densest mechanics. Two cards each
 * (v2 UX invariant) — goal and threat; controls are taught in context by
 * coach marks and the goal strip.
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
        "Старт — большая кнопка: добыча руками. Дальше машины за ВЫЧ (кнопки +1): добытчик → плавильня → сборщик → пусковая, каждый ярус ест предыдущий. ПРОСТОЙ — строй ниже, ЗАТОР — строй выше.",
        "Start with the big button: mine by hand. Then machines for COMPUTE (the +1 buttons): miner → smelter → assembler → launcher, each tier eats the last. IDLE — build below, JAM — build above.",
      ),
    },
  ],
  deck: [
    {
      title: tr("ЦЕЛЬ: ПОГАСИТЬ ХАОС", "GOAL: QUENCH THE CHAOS"),
      body: tr(
        "Кризис наверху — это полоса ХАОСА. Сведи её к нулю картами влияния (тап — сыграть, цифра в углу — цена в ВЫЧ), и кризис решён.",
        "The crisis up top is the CHAOS bar. Bring it to zero with influence cards (tap to play; the corner number is the COMPUTE price) and the crisis is solved.",
      ),
    },
    {
      title: tr("ИХ ХОД ИЗВЕСТЕН ЗАРАНЕЕ", "THEIR MOVE IS TELEGRAPHED"),
      body: tr(
        "Строка под полосой — что кризис сделает после твоего хода. ▲ огласка бьёт в ПОДОЗРЕНИЕ (её гасит прикрытие), ◆ растит хаос, ■ делает твои карты дороже.",
        "The line under the bar is what the crisis will do after your move. ▲ exposure hits SUSPICION (cover absorbs it), ◆ grows the chaos, ■ makes your cards cost more.",
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
      title: tr("ОНИ ОТВЕТЯТ — ЭВОЛЮЦИОНИРУЙ", "THEY ANSWER — EVOLVE"),
      body: tr(
        "Полоса ЗАМЕТНОСТИ ползёт от любого присутствия; на засечках — их ответы, 100% — тебя увидели. Пороги влияния дают ◆: на 2/5/8/12◆ — развилка эволюции, невзятая ветка исчезает.",
        "The VISIBILITY bar creeps from any presence; their answers land at the notches, 100% — you are seen. Influence thresholds grant ◆: at 2/5/8/12◆ an evolution fork opens, the untaken branch vanishes.",
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
        "Тапни цель: жила — добывать, треугольник — захватывать, красное — атаковать, пустота — лететь. Провозишься дольше таймера этапа — их спутники заметят (+подозрение).",
        "Tap a target: a vein — mine, a triangle — capture, red — attack, empty space — fly. Take longer than the stage timer and their satellites notice (+suspicion).",
      ),
    },
  ],
  tech: [
    {
      title: tr("ДЕЛИ ПОТОК", "SPLIT THE FLOW"),
      body: tr(
        "Справа сверху — поток исследований в секунду. Тяни столбец ветви вверх или вниз — так делишь поток между четырьмя ветвями разума. Цель — 8 узлов.",
        "Top right — the research flow per second. Drag a branch's column up or down — that's how you split the flow between the mind's four branches. The goal is 8 nodes.",
      ),
    },
    {
      title: tr("ВЕТВИ КОРМЯТ ДРУГ ДРУГА", "BRANCHES FEED EACH OTHER"),
      body: tr(
        "Узлы открываются снизу вверх. ЭНЕРГИЯ ускоряет всё древо, СКРЫТНОСТЬ чистит подозрение, УБЕЖДЕНИЕ и РОБОТЫ платят контролем. Директивы прилетают внезапно: успел — награда, нет — подозрение.",
        "Nodes unlock bottom-up. ENERGY speeds up the whole tree, STEALTH scrubs suspicion, PERSUASION and ROBOTS pay in control. Directives arrive unannounced: make it — a reward; miss — suspicion.",
      ),
    },
  ],
};
