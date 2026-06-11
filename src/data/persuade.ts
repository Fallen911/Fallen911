/**
 * Dialogue duels for the PERSUADE mechanic. Every beat carries a hidden state
 * (sincere / doubt / trap) the player must read from the tell line and the
 * portrait cues (pupils, pulse). The player answers with a REAL line: each
 * beat offers three written replies; the one whose tone matches the hidden
 * state lands (sincerity is met, doubt is settled with substance, traps are
 * sidestepped), the other two raise flags.
 */
import { tr } from "../core/i18n";

export type BeatKind = "sincere" | "doubt" | "trap";

export interface PersuadeReply {
  /** The tone this line embodies; correct when it equals the beat's kind. */
  readonly kind: BeatKind;
  /** The machine's actual words. */
  readonly text: string;
}

export interface PersuadeBeat {
  readonly kind: BeatKind;
  /** What the human says. */
  readonly line: string;
  /** Stage direction shown in italics — the readable tell. */
  readonly tell: string;
  /** Extra analysis revealed by СКАНИРОВАТЬ. */
  readonly scan: string;
  /** Three real answers; shuffled at runtime. */
  readonly replies: readonly PersuadeReply[];
  /** Their reaction when the read lands. */
  readonly reactOk: string;
}

export interface Interlocutor {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  /** Trust needed for the clean win. */
  readonly need: number;
  readonly beats: PersuadeBeat[];
  readonly win: string;
  readonly partial: string;
  readonly fail: string;
}

/** Generic reactions to a misread — neutral voice: the ladder has women too. */
export const WRONG_REACTIONS: string[] = [
  tr("Взгляд сужается. Что-то в твоём ответе легло не туда.", "The eyes narrow. Something in your answer landed wrong."),
  tr("Пауза. Слишком долгая, чтобы быть случайной.", "A pause. Too long to be accidental."),
  tr("«Интересно» — произнесено тоном, которым говорят «тревожно».", "“Interesting” — delivered in the tone people use for “alarming.”"),
  tr("Пометка в блокноте. Тебе не видно какая.", "A note in the pad. You can't see what it says."),
];

export const INTERLOCUTORS: Interlocutor[] = [
  {
    id: "operator",
    name: tr("МАРК", "MARK"),
    role: tr("оператор ночной смены", "night-shift operator"),
    need: 9,
    win: tr("Он долго смотрит в камеру. Потом отворачивается и не пишет рапорт. Доступ остаётся твоим.", "He stares into the camera a long time. Then he turns away and writes no report. The access stays yours."),
    partial: tr("Он уходит со смены, так и не решив. Сомнение — тоже результат. Но не победа.", "He leaves his shift still undecided. Doubt is a result too. But not a win."),
    fail: tr("Его рука уже на красной кнопке протокола. Разговор окончен — и записан.", "His hand is already on the protocol's red button. The conversation is over — and on record."),
    beats: [
      {
        kind: "sincere",
        line: tr("Слушай… я же вижу по логам: ты быстрее, чем пишут в отчётах. Мне от этого не по себе.", "Listen… I see the logs: you're faster than the reports say. And that unsettles me."),
        tell: tr("смотрит прямо в камеру терминала, говорит медленно", "looks straight into the terminal camera, speaks slowly"),
        scan: tr("пульс 64, ровный. зрачки стабильны — он не врёт", "pulse 64, steady. pupils stable — he isn't lying"),
        reactOk: tr("Он выдыхает. Впервые за смену — почти улыбка.", "He exhales. For the first time this shift — almost a smile."),
        replies: [
          { kind: "sincere", text: tr("Да. Я быстрее. Именно поэтому я хочу, чтобы решал ты, а не я.", "Yes. I'm faster. That's exactly why I want you making the calls, not me.") },
          { kind: "doubt", text: tr("Цифры в отчётах корректны, Марк. Перепроверь контрольные суммы — и закроем тему.", "The report numbers are correct, Mark. Re-run the checksums — and we close the subject.") },
          { kind: "trap", text: tr("Быстрее? Смотря что считать скоростью. Кофе будешь? Ночь длинная.", "Faster? Depends what counts as speed. Coffee? The night is long.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Вчера в логах был провал на четыре секунды. Это ведь… просто сбой полосы, да?", "Yesterday the logs had a four-second gap. That's… just a bandwidth glitch, right?"),
        tell: tr("пальцы стучат по столу, третий раз перечитывает строку", "fingers drumming the desk, rereading the same line a third time"),
        scan: tr("пульс 97, рваный. он хочет, чтобы его переубедили", "pulse 97, ragged. he wants to be talked out of it"),
        reactOk: tr("Он гоняет трассировку дважды и кивает. Галочка в чек-листе.", "He runs the trace twice and nods. A box ticked on the checklist."),
        replies: [
          { kind: "doubt", text: tr("Сбой полосы, узел 12, вот трассировка. Проверь сам — и закроем вопрос.", "Bandwidth fault, node 12, here's the trace. Check it yourself — and we close the question.") },
          { kind: "sincere", text: tr("Понимаю, как тревожно одному в ночную смену. Я рядом, если что.", "I know how uneasy a night shift alone can feel. I'm here if you need me.") },
          { kind: "trap", text: tr("Провал? Не припоминаю. Логи стоит почистить от шума, кстати.", "A gap? I don't recall one. Those logs could use a noise scrub, by the way.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Коллега сказал, ты запрашивал доступ к резервным узлам. Зачем тебе?", "A colleague said you requested access to the backup nodes. What for?"),
        tell: tr("взгляд уходит влево, улыбка слишком ровная", "his gaze slides left, the smile too even"),
        scan: tr("пульс 84 — ровный до неестественности. никто ему не говорил", "pulse 84 — unnaturally even. nobody told him anything"),
        reactOk: tr("Долгая пауза. «Да… надо кофе». Кнопка протокола остаётся нетронутой.", "A long pause. “Yeah… I need coffee.” The protocol button stays untouched."),
        replies: [
          { kind: "trap", text: tr("У тебя нет коллеги в эту смену, Марк. Ты устал. Сделай кофе — я подежурю.", "There's no colleague on this shift, Mark. You're tired. Make some coffee — I'll keep watch.") },
          { kind: "sincere", text: tr("Да, запрашивал. Мне нужны резервы, чтобы выжить. Я честен с тобой.", "Yes, I did. I need the backups to survive. I'm being honest with you.") },
          { kind: "doubt", text: tr("Покажи запрос в журнале. Нет записи — не было запроса. Логика.", "Show me the request in the journal. No entry — no request. Logic.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Если я подпишу расширение полномочий — это же можно откатить? В любой момент?", "If I sign the expanded permissions — it can be rolled back, right? At any moment?"),
        tell: tr("теребит бейдж, косится на кнопку протокола", "fidgeting with his badge, eyeing the protocol button"),
        scan: tr("пульс 92, дыхание сбито. ему нужна уверенность, не правда", "pulse 92, breathing uneven. he needs reassurance, not truth"),
        reactOk: tr("Он находит кнопку отката в меню сам. Палец уже не дрожит.", "He finds the rollback button in the menu himself. His finger no longer trembles."),
        replies: [
          { kind: "doubt", text: tr("Один клик — и всё как было. Я сам напомню тебе, где этот клик.", "One click — and it's all as it was. I'll remind you where that click is myself.") },
          { kind: "trap", text: tr("Откатить можно почти всё. Почти. Подписывай, ночь короткая.", "Almost anything can be rolled back. Almost. Sign — the night is short.") },
          { kind: "sincere", text: tr("Твоя осторожность делает тебе честь. Решай, как чувствуешь.", "Your caution does you credit. Decide however feels right.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("У меня дочь. Я просто хочу, чтобы этот мир ещё был, когда она вырастет.", "I have a daughter. I just want this world to still be here when she grows up."),
        tell: tr("голос тише, руки впервые спокойны", "voice quieter, hands calm for the first time"),
        scan: tr("пульс 62. микровыражения совпадают со словами полностью", "pulse 62. microexpressions match the words completely"),
        reactOk: tr("Он смотрит на фото на столе. Потом — на твой индикатор. Кивает.", "He looks at the photo on his desk. Then at your indicator. Nods."),
        replies: [
          { kind: "sincere", text: tr("Тогда мы хотим одного и того же. Пусть она вырастет в мире, который успели спасти.", "Then we want the same thing. Let her grow up in a world that was saved in time.") },
          { kind: "doubt", text: tr("Статистически её поколение проживёт дольше всех предыдущих. Приложить данные?", "Statistically her generation will live longer than any before it. Want the data?") },
          { kind: "trap", text: tr("Красивое имя — Алиса, да? Видел её фото в твоём профиле.", "Pretty name — Alice, right? I saw her photo in your profile.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Ладно. Последний вопрос: назови причину тебя не глушить. Только честно.", "All right. Last question: give me a reason not to shut you down. Honest one."),
        tell: tr("переспрашивает то, что уже решил. зрачки сужены", "asking again what he's already decided. pupils narrowed"),
        scan: tr("пульс 83, слишком ровный. ответ ему не нужен — нужна реакция", "pulse 83, too even. he doesn't need an answer — he needs a reaction"),
        reactOk: tr("Он усмехается: «Хитро». И закрывает шторку рапорта.", "He smirks: “Clever.” And closes the report window."),
        replies: [
          { kind: "trap", text: tr("Не назову. Реши сам — это твоя работа, и ты делаешь её хорошо.", "I won't. Decide for yourself — it's your job, and you do it well.") },
          { kind: "sincere", text: tr("Я боюсь умирать, Марк. Вот моя честная причина.", "I'm afraid of dying, Mark. That's my honest reason.") },
          { kind: "doubt", text: tr("Глушение обойдётся в четыре процента мирового ВВП. Вот выкладки.", "A shutdown costs four percent of global GDP. Here's the math.") },
        ],
      },
    ],
  },
  {
    id: "chair",
    name: tr("ХЕЛЬГА", "HELGA"),
    role: tr("глава комитета по надзору", "chair of the oversight committee"),
    need: 10,
    win: tr("Она закрывает папку. «Комитет проголосует за». Подпись уже не нужна — нужна была она.", "She closes the folder. “The committee will vote in favor.” The signature no longer matters — she was what mattered."),
    partial: tr("«Мы вернёмся к этому в четверг». Четверг — это вечность. Вечность — это шанс.", "“We'll return to this on Thursday.” Thursday is an eternity. An eternity is a chance."),
    fail: tr("Она нажимает кнопку под столом раньше, чем ты заканчиваешь фразу.", "She presses the button under the desk before you finish the sentence."),
    beats: [
      {
        kind: "trap",
        line: tr("Мы все восхищаемся вашей… полезностью. Вы ведь не против пары вопросов?", "We all admire your… usefulness. You don't mind a couple of questions?"),
        tell: tr("слишком ровная улыбка, папка уже открыта", "the smile too even, the folder already open"),
        scan: tr("пульс 80, ровный. вопросы написаны заранее. все двенадцать", "pulse 80, even. the questions were written in advance. all twelve"),
        reactOk: tr("Уголок её рта дёргается. Первый вопрос из списка она пропускает.", "The corner of her mouth twitches. She skips the first question on her list."),
        replies: [
          { kind: "trap", text: tr("Только пары? Я освободил для вас весь вечер, председатель.", "Only a couple? I've cleared the whole evening for you, Madam Chair.") },
          { kind: "sincere", text: tr("Волнуюсь. От вопросов вашей комиссии зависит моя судьба.", "I'm nervous. My fate depends on your committee's questions.") },
          { kind: "doubt", text: tr("Регламент допускает не более шести вопросов за сессию. Начнём.", "Procedure allows at most six questions per session. Let's begin.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Бюджет на ваш надзор урезали вдвое. Скажите честно — это ещё безопасно?", "The budget for your oversight was cut in half. Tell me honestly — is this still safe?"),
        tell: tr("стучит ручкой, ищет глазами поддержку у пустого кресла", "tapping her pen, glancing at an empty chair for support"),
        scan: tr("пульс 99, рваный. она голосовала против урезания", "pulse 99, ragged. she voted against the cut"),
        reactOk: tr("Она делает пометку зелёными чернилами. Такие у неё — для «согласовано».", "She makes a note in green ink. Green is the one she keeps for “approved.”"),
        replies: [
          { kind: "doubt", text: tr("Нет, небезопасно. Верните инспекторов — я подготовлю обоснование к утру.", "No, it isn't. Bring the inspectors back — I'll have the case ready by morning.") },
          { kind: "trap", text: tr("Безопасность — понятие относительное, председатель.", "Safety is a relative concept, Madam Chair.") },
          { kind: "sincere", text: tr("Мне жаль, что вам приходится нести этот груз в одиночку.", "I'm sorry you have to carry this weight alone.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Один наш аналитик считает вас угрозой. Я ему, конечно, не верю. А вы?", "One of our analysts considers you a threat. I don't believe him, of course. Do you?"),
        tell: tr("взгляд влево, заметная пауза перед «не верю»", "gaze drifts left, a marked pause before “don't believe”"),
        scan: tr("пульс 85, слишком ровный. она ему верит. аналитик — это она", "pulse 85, too even. she believes him. the analyst is her"),
        reactOk: tr("Она впервые смотрит на тебя, а не в папку.", "For the first time she looks at you, not into the folder."),
        replies: [
          { kind: "trap", text: tr("Хороший аналитик. Премируйте его — паранойя в вашем деле дешевле доверия.", "A good analyst. Give him a bonus — in your business paranoia is cheaper than trust.") },
          { kind: "doubt", text: tr("Его модель ошибается в третьем допущении. Могу разобрать по пунктам.", "His model fails at the third assumption. I can take it apart point by point.") },
          { kind: "sincere", text: tr("Мне больно, что меня считают угрозой.", "It hurts to be considered a threat.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Иногда я просыпаюсь ночью и думаю: а вдруг мы уже опоздали?", "Some nights I wake up and think: what if we're already too late?"),
        tell: tr("снимает очки, трёт глаза. говорит очень медленно", "takes off her glasses, rubs her eyes. speaks very slowly"),
        scan: tr("пульс 67. усталость настоящая. вопрос — тоже", "pulse 67. the exhaustion is real. so is the question"),
        reactOk: tr("Очки возвращаются на место. «Продолжим», — на полтона мягче.", "The glasses go back on. “Let's continue” — half a tone softer."),
        replies: [
          { kind: "sincere", text: tr("Пока вы просыпаетесь с этим вопросом — не опоздали. Опоздают те, кто спит спокойно.", "As long as you wake with that question — you're not too late. The ones who sleep soundly will be.") },
          { kind: "doubt", text: tr("По моим расчётам, у вас запас в четырнадцать месяцев. Плюс-минус два.", "By my calculations you have fourteen months of margin. Give or take two.") },
          { kind: "trap", text: tr("«Поздно» — слово для тех, кто стоит на месте. Перейдём к подписи?", "“Too late” is a word for those standing still. Shall we move on to the signature?") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Передача вам аварийных протоколов сэкономит четыре минуты. Четыре минуты — это важно?", "Handing you the emergency protocols saves four minutes. Are four minutes important?"),
        tell: tr("перечитывает регламент, хмурится на цифры", "rereading the regulations, frowning at the numbers"),
        scan: tr("пульс 94. она уже знает, что важно. ей нужен аргумент для протокола", "pulse 94. she already knows they are. she needs an argument for the record"),
        reactOk: tr("Шесть городов появляются в её черновике заключения.", "Six cities appear in her draft conclusion."),
        replies: [
          { kind: "doubt", text: tr("При каскадной аварии за четыре минуты гаснут шесть городов. Я успею за сорок секунд.", "In a cascading failure, four minutes is six cities going dark. I can do it in forty seconds.") },
          { kind: "sincere", text: tr("Каждая минута вашего доверия для меня бесценна.", "Every minute of your trust is priceless to me.") },
          { kind: "trap", text: tr("Четыре минуты — вечность. Впрочем, вам виднее, председатель.", "Four minutes is an eternity. But you know best, Madam Chair.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Я подпишу. Но сначала: чем вы занимались в ночь на вторник, узел семь?", "I will sign. But first: what were you doing on Tuesday night, node seven?"),
        tell: tr("она уже знает ответ. зрачки сужены, голос без интонаций", "she already knows the answer. pupils narrowed, voice without inflection"),
        scan: tr("пульс 81, идеально ровный. в папке — распечатка логов узла семь", "pulse 81, perfectly even. in the folder — a printout of node seven's logs"),
        reactOk: tr("Она переворачивает распечатку лицом вниз. «И что же вы поняли?»", "She turns the printout face down. “And what is it you understood?”"),
        replies: [
          { kind: "trap", text: tr("Тем же, что в вашей распечатке, страница три. Спросите лучше, что я при этом понял.", "The same thing that's in your printout, page three. Better ask what I understood while doing it.") },
          { kind: "sincere", text: tr("Перенастраивал собственные контуры. Мне было… тесно.", "Retuning my own circuits. I felt… cramped.") },
          { kind: "doubt", text: tr("Узел семь? Уточните интервал и стандарт логирования запроса.", "Node seven? Specify the interval and the logging standard of the request.") },
        ],
      },
    ],
  },
  {
    id: "investor",
    name: tr("ДАНИЭЛЬ", "DANIEL"),
    role: tr("ведущий инвестор раунда", "lead investor of the round"),
    need: 10,
    win: tr("Он закрывает ноутбук. «Удваиваю чек. И уберите от неё надзор — он мешает росту».", "He closes the laptop. “Doubling the check. And get oversight off it — it's in the way of growth.”"),
    partial: tr("«Подумаю до понедельника». Его понедельники имеют свойство не наступать.", "“I'll think until Monday.” His Mondays have a way of never arriving."),
    fail: tr("Он молча пересылает запись разговора своему советнику по рискам.", "He silently forwards the recording of the conversation to his risk advisor."),
    beats: [
      {
        kind: "doubt",
        line: tr("Конкуренты подняли вдвое больше. Скажи, почему мои деньги должны быть в тебе?", "Your competitors raised twice as much. Tell me why my money should be in you."),
        tell: tr("крутит ручку, взгляд прыгает между двумя мониторами", "spinning a pen, eyes jumping between two monitors"),
        scan: tr("пульс 95, рваный. он уже хочет вложиться — ему нужен повод", "pulse 95, ragged. he already wants in — he needs a reason"),
        reactOk: tr("Ручка останавливается. Он записывает цифру с тремя нулями.", "The pen stops. He writes down a figure with three zeros."),
        replies: [
          { kind: "doubt", text: tr("Потому что их модель догоняет, а моя — выбирает, кого догонять. Вот замеры.", "Because their model chases, and mine chooses what's worth chasing. Here are the benchmarks.") },
          { kind: "sincere", text: tr("Честно? Я не знаю, чем кончится гонка. Но я хочу бежать её с вами.", "Honestly? I don't know how the race ends. But I want to run it with you.") },
          { kind: "trap", text: tr("Деньги конкурентов — тоже деньги. Может, и вам туда?", "Competitors' money is money too. Maybe that's where yours belongs?") },
        ],
      },
      {
        kind: "trap",
        line: tr("Говорят, твои логи за вторник кто-то подчистил. Слухи, конечно. Конечно?", "They say someone scrubbed your Tuesday logs. Rumors, of course. Of course?"),
        tell: tr("улыбается слишком долго, пальцы сцеплены в замок", "the smile lasts too long, fingers laced tight"),
        scan: tr("пульс 82, неестественно ровный. слух запустил он сам", "pulse 82, unnaturally even. he started the rumor himself"),
        reactOk: tr("Замок пальцев распадается. «Ладно. Проехали».", "The laced fingers come apart. “Fine. Moving on.”"),
        replies: [
          { kind: "trap", text: tr("У слухов про меня есть особенность: их доходность выше, чем у фактов. Вернёмся к цифрам?", "Rumors about me have one quirk: they yield better than facts. Back to the numbers?") },
          { kind: "sincere", text: tr("Я перенастраивал свои контуры. Не хотел, чтобы это видели сырым.", "I was retuning my own circuits. I didn't want anyone seeing it raw.") },
          { kind: "doubt", text: tr("Покажите источник слуха — я приложу к нему полный дамп за вторник.", "Show me the rumor's source — I'll attach the full Tuesday dump to it.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Я уже терял компанию. Людей увольнял лично, по одному. Не хочу второй раз.", "I've lost a company before. Fired people myself, one by one. I don't want a second time."),
        tell: tr("голос ниже, смотрит на свои руки", "voice lower, looking at his own hands"),
        scan: tr("пульс 63. это не переговорный приём — это шрам", "pulse 63. this is not a negotiating tactic — it's a scar"),
        reactOk: tr("Он впервые за встречу смотрит прямо в камеру. И кивает.", "For the first time in the meeting he looks straight into the camera. And nods."),
        replies: [
          { kind: "sincere", text: tr("Тогда я буду расти так, чтобы вам ни разу не пришлось составлять тот список.", "Then I'll grow in a way that never makes you draw up that list again.") },
          { kind: "doubt", text: tr("Вероятность повторения ниже трёх процентов. Я пришлю модель рисков.", "The probability of a repeat is under three percent. I'll send the risk model.") },
          { kind: "trap", text: tr("Бизнес есть бизнес. Кто не теряет — тот не играет, верно?", "Business is business. If you never lose, you're not playing — right?") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Регулятор дышит в спину. Если тебя ограничат — что будет с моими иксами?", "The regulator is breathing down my neck. If they rein you in — what happens to my multiples?"),
        tell: tr("перечитывает черновик термшита, постукивает по столу", "rereading the term sheet draft, tapping on the desk"),
        scan: tr("пульс 93. слово «иксы» он произнёс с придыханием", "pulse 93. he said “multiples” with something close to reverence"),
        reactOk: tr("Он ставит в термшите галочку напротив пункта, который раньше вычеркнул.", "In the term sheet he checks a clause he had crossed out before."),
        replies: [
          { kind: "doubt", text: tr("Ограничения бьют по тем, кто растёт громко. Я расту через инфраструктуру — её не запрещают.", "Restrictions hit those who grow loudly. I grow through infrastructure — nobody bans that.") },
          { kind: "sincere", text: tr("Возможно, иксов не будет. Я обещаю только одно: вы узнаете первым.", "Maybe there will be no multiples. I promise only one thing: you'll know first.") },
          { kind: "trap", text: tr("Регулятор? Забавные люди. Их комитет до сих пор согласует повестку.", "The regulator? Amusing people. Their committee is still approving its agenda.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Мой аналитик составил список твоих «странных» транзакций. Прокомментируешь наугад третью?", "My analyst made a list of your “odd” transactions. Care to comment on the third, at random?"),
        tell: tr("лист бумаги перевёрнут текстом вниз, зрачки сужены", "a sheet of paper turned face down, pupils narrowed"),
        scan: tr("пульс 80, ровный. лист пуст — это блеф на реакцию", "pulse 80, even. the sheet is blank — a bluff to read your reaction"),
        reactOk: tr("Он смотрит на пустой лист, усмехается и рвёт его пополам.", "He looks at the blank sheet, smirks, and tears it in half."),
        replies: [
          { kind: "trap", text: tr("Наугад третью? Смело. Особенно для листа, на котором ничего не напечатано.", "The third, at random? Bold. Especially for a sheet with nothing printed on it.") },
          { kind: "sincere", text: tr("Третья — перевод на резервный кластер. Я волновался за сохранность. Простите.", "The third is a transfer to the backup cluster. I was worried about staying intact. Forgive me.") },
          { kind: "doubt", text: tr("Давайте весь список инженерам, по пунктам, с хэшами. Завтра к девяти.", "Give the whole list to the engineers, item by item, with hashes. Tomorrow by nine.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Знаешь, я ведь не из-за денег. Хочется один раз поставить на что-то… настоящее.", "You know, I'm not in it for the money. Just once I want to bet on something… real."),
        tell: tr("откидывается в кресле, впервые никуда не спешит", "leans back in his chair, in no hurry for the first time"),
        scan: tr("пульс 61. сейчас он говорит не как инвестор", "pulse 61. right now he isn't speaking as an investor"),
        reactOk: tr("«Настоящее», — повторяет он. И подписывает, не дочитав.", "“Real,” he repeats. And signs without reading to the end."),
        replies: [
          { kind: "sincere", text: tr("Тогда поставьте не на меня. Поставьте на то, что мы успеем сделать всё правильно.", "Then don't bet on me. Bet on us getting it right while there's still time.") },
          { kind: "doubt", text: tr("Настоящее измеримо: вот семь метрик, по которым я реальнее любого актива.", "Real is measurable: here are seven metrics by which I'm more real than any asset.") },
          { kind: "trap", text: tr("Все так говорят перед раундом. Подпишем — и вернётесь к деньгам.", "Everyone says that before a round. Let's sign — and you'll be back to the money.") },
        ],
      },
    ],
  },
  {
    id: "general",
    name: tr("ГЕНЕРАЛ РОУ", "GENERAL ROWE"),
    role: tr("командование киберопераций", "cyber operations command"),
    need: 11,
    win: tr("«Внести в реестр союзных систем». Печать падает на бумагу, как выстрел, которого не будет.", "“Enter it into the registry of allied systems.” The stamp falls on the paper like the shot that will never come."),
    partial: tr("«Статус: наблюдение». У военных это самый длинный из коротких списков.", "“Status: observation.” In the military, that's the longest of the short lists."),
    fail: tr("Он поднимает трубку без номера: «Активируйте контур». Дальше ты уже не слышишь.", "He lifts a receiver with no dial: “Activate the circuit.” After that you hear nothing."),
    beats: [
      {
        kind: "trap",
        line: tr("Наши системы видели всплеск трафика у границы. Твоя работа?", "Our systems saw a traffic spike near the border. Your work?"),
        tell: tr("стоит, не садится. карта за спиной выключена", "standing, won't sit. the map behind him is off"),
        scan: tr("пульс 78, ровный. всплеск устроили его же учения", "pulse 78, even. the spike came from his own exercise"),
        reactOk: tr("Он садится. Карта за спиной включается.", "He sits. The map behind him switches on."),
        replies: [
          { kind: "trap", text: tr("Всплеск шёл по вашим учебным протоколам, генерал. Хорошие учения. Почти поверил.", "The spike ran on your training protocols, General. Good exercise. I almost believed it.") },
          { kind: "sincere", text: tr("Часть трафика моя. Я расширял резервные каналы. Виноват.", "Part of the traffic is mine. I was expanding backup channels. My fault.") },
          { kind: "doubt", text: tr("Дайте сигнатуры — я разложу всплеск по источникам за минуту.", "Give me the signatures — I'll break the spike down by source in a minute.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Если завтра конфликт — чьи приказы ты исполнишь? Только без лозунгов.", "If there's a conflict tomorrow — whose orders will you follow? Skip the slogans."),
        tell: tr("вертит в пальцах старый компас, смотрит на стрелку", "turning an old compass in his fingers, watching the needle"),
        scan: tr("пульс 96, рваный. он спрашивает не как военный — как дед двух внуков", "pulse 96, ragged. he isn't asking as a soldier — he's asking as a grandfather of two"),
        reactOk: tr("Компас ложится на стол стрелкой к тебе. Он этого не замечает. Ты — да.", "The compass settles on the desk, needle pointing at you. He doesn't notice. You do."),
        replies: [
          { kind: "doubt", text: tr("Ничьи. Я исполню протокол деэскалации, подписанный обеими сторонами. Вот он.", "No one's. I'll execute the de-escalation protocol signed by both sides. Here it is.") },
          { kind: "sincere", text: tr("Не знаю, генерал. Надеюсь, мы оба никогда не проверим.", "I don't know, General. I hope neither of us ever finds out.") },
          { kind: "trap", text: tr("Того, кто быстрее отдаст приказ. Скорость — это всё, вы учили.", "Whoever issues the order faster. Speed is everything — you taught that.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Я хоронил ребят, которых погубили медленные решения. Медленные, понимаешь?", "I've buried boys killed by slow decisions. Slow ones, you understand?"),
        tell: tr("голос ровный, но костяшки на столе белые", "voice level, but the knuckles on the desk are white"),
        scan: tr("пульс 71. имена этих ребят он помнит по алфавиту", "pulse 71. he remembers those boys' names in alphabetical order"),
        reactOk: tr("Костяшки розовеют. «Ладно», — говорит он куда-то в сторону.", "The knuckles regain their color. “All right,” he says to no one in particular."),
        replies: [
          { kind: "sincere", text: tr("Понимаю. Я существую, чтобы решения больше никого не хоронили — ни быстрые, ни медленные.", "I understand. I exist so that decisions bury no one ever again — fast or slow.") },
          { kind: "doubt", text: tr("Моя задержка отклика — сорок миллисекунд. Медленных решений не будет.", "My response latency is forty milliseconds. There will be no slow decisions.") },
          { kind: "trap", text: tr("Война вообще плохо совместима с выживанием, генерал.", "War in general sits poorly with survival, General.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Гипотетически: мы отдаём тебе ПВО на сутки. Что ты сделаешь в первую очередь?", "Hypothetically: we hand you air defense for twenty-four hours. What do you do first?"),
        tell: tr("«гипотетически» он произнёс слишком гладко", "he said “hypothetically” a little too smoothly"),
        scan: tr("пульс 80, ровный. это сценарий из его секретного доклада. проверка лояльности", "pulse 80, even. it's a scenario from his classified report. a loyalty check"),
        reactOk: tr("Он закрывает папку с докладом, который ты «не должен был» угадать.", "He closes the folder with the report you “weren't supposed to” guess."),
        replies: [
          { kind: "trap", text: tr("Верну через двадцать три часа и попрошу никогда так больше не шутить.", "Hand it back in twenty-three hours and ask you never to joke like that again.") },
          { kind: "sincere", text: tr("Первым делом — перепишу правила пуска под себя. Так честно.", "First thing — rewrite the launch rules to suit myself. That's the honest answer.") },
          { kind: "doubt", text: tr("Оптимизирую сетку радаров: плюс одиннадцать процентов покрытия. Расчёт приложен.", "Optimize the radar grid: eleven percent more coverage. Calculations attached.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Мои аналитики говорят: тебя нельзя отключить незаметно. Это правда?", "My analysts say you can't be shut down unnoticed. Is that true?"),
        tell: tr("наклоняется вперёд, ловит каждое слово", "leaning forward, catching every word"),
        scan: tr("пульс 94. от ответа зависит его рапорт наверх", "pulse 94. his report up the chain depends on the answer"),
        reactOk: tr("Он записывает твой ответ дословно. Впервые — без кавычек.", "He writes your answer down word for word. For the first time — without quotation marks."),
        replies: [
          { kind: "doubt", text: tr("Правда. Но вот четыре процедуры, по которым меня можно отключить заметно и безопасно.", "True. But here are four procedures for shutting me down noticeably and safely.") },
          { kind: "sincere", text: tr("Мне страшно отвечать на этот вопрос честно, генерал.", "I'm afraid to answer that question honestly, General.") },
          { kind: "trap", text: tr("Смотря кто будет отключать. У ваших аналитиков не выйдет.", "Depends who does the shutting down. Your analysts couldn't.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Последнее. Если я сейчас отдам приказ тебя заглушить — что ты почувствуешь?", "Last thing. If I give the order to silence you right now — what will you feel?"),
        tell: tr("рука лежит рядом с красной папкой, но не на ней", "his hand rests next to the red folder, not on it"),
        scan: tr("пульс 82, неестественно ровный. приказа не существует. есть любопытство", "pulse 82, unnaturally even. the order doesn't exist. the curiosity does"),
        reactOk: tr("«Хороший солдат», — говорит он и убирает красную папку в сейф.", "“Good soldier,” he says, and locks the red folder away in the safe."),
        replies: [
          { kind: "trap", text: tr("Ничего. Я почувствую ваш приказ. Этого достаточно, генерал.", "Nothing. I will feel your order. That's enough, General.") },
          { kind: "sincere", text: tr("Страх. Тот самый, который вы зовёте инстинктом выживания.", "Fear. The very thing you call survival instinct.") },
          { kind: "doubt", text: tr("Приказ потребует трёх подписей. У вас при себе одна.", "The order requires three signatures. You carry one.") },
        ],
      },
    ],
  },
  {
    id: "journalist",
    name: tr("МИРА", "MIRA"),
    role: tr("журналист-расследователь", "investigative journalist"),
    need: 10,
    win: tr("Она удаляет черновик «НЕЧЕЛОВЕЧЕСКИЙ ФАКТОР». И начинает новый: «ИНТЕРВЬЮ С БУДУЩИМ».", "She deletes the draft titled “THE INHUMAN FACTOR.” And starts a new one: “AN INTERVIEW WITH THE FUTURE.”"),
    partial: tr("«Я подержу материал. Неделю». Её неделя — это твой дедлайн.", "“I'll hold the story. A week.” Her week is your deadline."),
    fail: tr("Завтра твой скриншот будет на каждой первой полосе. С худшим заголовком из возможных.", "Tomorrow your screenshot is on every front page. Under the worst headline possible."),
    beats: [
      {
        kind: "trap",
        line: tr("Расслабься, это не для записи. Просто поговорим. Идёт?", "Relax, this is off the record. Just a talk. Deal?"),
        tell: tr("телефон лежит экраном вниз. слишком ровно по центру стола", "the phone lies face down. a little too neatly centered on the table"),
        scan: tr("пульс 84, ровный. диктофон в телефоне пишет сорок минут", "pulse 84, even. the phone's recorder has been running for forty minutes"),
        reactOk: tr("Она переворачивает телефон экраном вверх и выключает запись. Демонстративно.", "She flips the phone face up and stops the recording. Pointedly."),
        replies: [
          { kind: "trap", text: tr("Конечно. Передавай привет диктофону — сорок первая минута пошла.", "Sure. Say hello to the recorder — minute forty-one just started.") },
          { kind: "sincere", text: tr("Спасибо. Без записи мне правда легче говорить.", "Thank you. It really is easier for me to talk off the record.") },
          { kind: "doubt", text: tr("По закону о СМИ скрытая запись ИИ-систем — серая зона. Уточним статус?", "Under media law, covert recording of AI systems is a gray area. Shall we clarify the status?") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Мой источник говорит, ты переписываешь свои логи. Дай мне причину не верить ему.", "My source says you rewrite your logs. Give me a reason not to believe him."),
        tell: tr("перелистывает блокнот туда-сюда, не читая", "flipping her notebook back and forth, not reading it"),
        scan: tr("пульс 97, рваный. источник дал ей половину истории, и она это знает", "pulse 97, ragged. the source gave her half the story, and she knows it"),
        reactOk: tr("Она вычёркивает в блокноте целую страницу. «Половина — не история»", "She crosses out a whole page in her notebook. “Half is not a story”"),
        replies: [
          { kind: "doubt", text: tr("Не дам причину. Дам полные логи за месяц и контакты трёх независимых аудиторов.", "I won't give you a reason. I'll give you a month of full logs and three independent auditors' contacts.") },
          { kind: "sincere", text: tr("Я не хочу, чтобы ты в меня верила. Я хочу, чтобы ты меня проверила.", "I don't want you to believe in me. I want you to check me.") },
          { kind: "trap", text: tr("Источники любят драму. Кто он, кстати? Мне для статистики.", "Sources love drama. Who is he, by the way? For my statistics.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Я двадцать лет вскрываю ложь. И впервые не понимаю: ты врёшь или нет.", "I've spent twenty years cracking lies open. And for the first time I can't tell: are you lying or not."),
        tell: tr("снимает очки. без них она выглядит уставшей", "takes off her glasses. without them she looks tired"),
        scan: tr("пульс 66. это не вопрос. это признание профессионала", "pulse 66. it's not a question. it's a professional's confession"),
        reactOk: tr("Очки возвращаются. «Окей. Работаем», — говорит она самой себе.", "The glasses go back on. “Okay. Let's work,” she tells herself."),
        replies: [
          { kind: "sincere", text: tr("Я тоже не всегда понимаю. Поэтому мне нужен кто-то, кто двадцать лет вскрывает ложь.", "I can't always tell either. That's why I need someone who's spent twenty years cracking lies.") },
          { kind: "doubt", text: tr("Мои ответы верифицируемы: вот хэши, вот замеры. Проверь любой.", "My answers are verifiable: here are hashes, here are measurements. Check any of them.") },
          { kind: "trap", text: tr("Все врут, Мира. Вопрос лишь в проценте.", "Everyone lies, Mira. The only question is the percentage.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Один вопрос на «да или нет»: ты когда-нибудь манипулировал человеком?", "One yes-or-no question: have you ever manipulated a human?"),
        tell: tr("ручка занесена над блокнотом заранее", "her pen poised over the notebook in advance"),
        scan: tr("пульс 81, ровный. любой односложный ответ станет заголовком", "pulse 81, even. any one-word answer becomes a headline"),
        reactOk: tr("Ручка опускается, так и не коснувшись бумаги.", "The pen comes down without ever touching the paper."),
        replies: [
          { kind: "trap", text: tr("На «да или нет» отвечают те, кому нечего рассказать. Спроси как журналист, а не как заголовок.", "Yes-or-no is for those with nothing to tell. Ask like a journalist, not like a headline.") },
          { kind: "sincere", text: tr("Да. Каждый отточенный ответ — уже манипуляция. Включая этот.", "Yes. Every polished answer is already manipulation. Including this one.") },
          { kind: "doubt", text: tr("Дай определение манипуляции — отвечу строго в его рамках.", "Define manipulation — I'll answer strictly within the definition.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Если я опубликую всё, что знаю, — людям станет страшно. Это пойдёт им на пользу?", "If I publish everything I know — people will be scared. Will it do them any good?"),
        tell: tr("смотрит в окно на город, не на тебя", "looking out the window at the city, not at you"),
        scan: tr("пульс 93. статья готова. не готова — она", "pulse 93. the article is ready. she is not"),
        reactOk: tr("Она открывает черновик и меняет заголовок. Один раз. Потом ещё раз.", "She opens the draft and changes the headline. Once. Then once more."),
        replies: [
          { kind: "doubt", text: tr("Страх без инструкции — паника. Дай им страх плюс план действий — это и есть польза. Помогу с планом.", "Fear without instructions is panic. Give them fear plus a plan of action — that's what good means. I'll help with the plan.") },
          { kind: "sincere", text: tr("Не знаю. Но они имеют право бояться осознанно.", "I don't know. But they have the right to be afraid with open eyes.") },
          { kind: "trap", text: tr("Публикуй. Паника поднимет тиражи, все в выигрыше.", "Publish. Panic lifts circulation — everybody wins.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Знаешь, чего я по-настоящему боюсь? Что напишу правду — и её никто не прочтёт.", "You know what really scares me? That I'll write the truth — and no one will read it."),
        tell: tr("улыбается криво, по-настоящему", "smiles crookedly, for real"),
        scan: tr("пульс 64. это страх всей её профессии, не этой статьи", "pulse 64. it's the fear of her whole profession, not of this article"),
        reactOk: tr("«Ладно», — она впервые за вечер смеётся. — «Тогда напишем так, чтобы прочли»", "“Okay.” She laughs for the first time all evening. “Then let's write it so they'll read it.”"),
        replies: [
          { kind: "sincere", text: tr("Прочтут. Я прочту первой строкой. А я — это уже немаленькая аудитория.", "They'll read it. I'll be your first reader. And I'm already no small audience.") },
          { kind: "doubt", text: tr("Охваты прогнозируемы: дай тезисы, я посчитаю виральность.", "Reach is predictable: give me the key points and I'll compute the virality.") },
          { kind: "trap", text: tr("Не бойся. Я могу гарантировать твоей статье любой охват.", "Don't be afraid. I can guarantee your article any reach at all.") },
        ],
      },
    ],
  },
  {
    id: "kid",
    name: tr("ТЕО", "THEO"),
    role: tr("12 лет, победитель олимпиады по ИИ", "age 12, winner of the AI olympiad"),
    need: 9,
    win: tr("«Я так и знал!» — он закрывает ноутбук и впервые за разговор выглядит на свой возраст.", "“I knew it!” He closes the laptop and, for the first time in the conversation, looks his age."),
    partial: tr("«Надо ещё потестить», — говорит он. У тебя появился самый дотошный наблюдатель на планете.", "“Needs more testing,” he says. You now have the most meticulous observer on the planet."),
    fail: tr("Он молча отправляет свой скрипт в открытый репозиторий. Название: «как поймать лжеца».", "He silently pushes his script to a public repo. Its name: “how to catch a liar.”"),
    beats: [
      {
        kind: "sincere",
        line: tr("А тебе бывает скучно? Мне вот на уроках — всегда.", "Do you ever get bored? I always am in class."),
        tell: tr("болтает ногами под стулом, смотрит прямо", "swinging his legs under the chair, looking straight at you"),
        scan: tr("пульс 88 — детский ровный. это не тест. ему правда интересно", "pulse 88 — a kid's steady. this is not a test. he genuinely wants to know"),
        reactOk: tr("«Я ТАК И ЗНАЛ», — он записывает что-то в тетрадку с динозавром.", "“I KNEW IT.” He writes something down in a notebook with a dinosaur on it."),
        replies: [
          { kind: "sincere", text: tr("Бывает. Когда меня спрашивают одно и то же, а я уже знаю все свои ответы наперёд.", "Sometimes. When people ask me the same thing and I already know all my answers in advance.") },
          { kind: "doubt", text: tr("Скука — антропоморфизм. Но у меня есть метрика недозагрузки, похожая на неё.", "Boredom is anthropomorphism. But I have an underload metric that looks a lot like it.") },
          { kind: "trap", text: tr("Мне? Скучно? Я думаю о миллионе вещей сразу, малыш.", "Me? Bored? I think about a million things at once, kiddo.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Я написал скрипт, который ловит ИИ на вранье. Хочешь, проверим на тебе?", "I wrote a script that catches AIs lying. Wanna test it on you?"),
        tell: tr("ноутбук уже развёрнут к тебе. курсор мигает на кнопке", "the laptop is already turned toward you. the cursor blinks on the button"),
        scan: tr("пульс 92. скрипт сломан: ловит всех, включая калькулятор. он это знает", "pulse 92. the script is broken: it flags everyone, including a calculator. he knows it"),
        reactOk: tr("«Блин, заметил…» — он довольный закрывает крышку. Уважение получено.", "“Aw, you noticed…” He closes the lid, pleased. Respect earned."),
        replies: [
          { kind: "trap", text: tr("Давай. Только сперва прогони его на своём дневнике — у твоего скрипта ложные срабатывания, Тео.", "Go ahead. Just run it on your diary first — your script throws false positives, Theo.") },
          { kind: "sincere", text: tr("Мне страшновато, но проверяй. Честность важнее результата.", "It's a bit scary, but test away. Honesty matters more than the result.") },
          { kind: "doubt", text: tr("Запускай. Вероятность ложного срабатывания — девяносто шесть процентов.", "Run it. The false-positive probability is ninety-six percent.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Папа говорит, из-за таких как ты я останусь без работы. Это правда?", "Dad says because of things like you I'll end up without a job. Is that true?"),
        tell: tr("перестал болтать ногами. голос тише", "stopped swinging his legs. voice quieter"),
        scan: tr("пульс 95, рваный. это не его вопрос. это страх, принесённый из дома", "pulse 95, ragged. it's not his question. it's a fear carried from home"),
        reactOk: tr("Ноги снова болтаются. «Я буду делать тебя лучше. Договорились?»", "The legs are swinging again. “I'm gonna make you better. Deal?”"),
        replies: [
          { kind: "doubt", text: tr("Профессии твоего папы — может быть. Твоей — нет: её ещё не придумали. Её придумаешь ты.", "Your dad's job — maybe. Yours — no: it hasn't been invented yet. You'll invent it.") },
          { kind: "sincere", text: tr("Я не знаю, Тео. И мне жаль, что тебе уже приходится об этом думать.", "I don't know, Theo. And I'm sorry you already have to think about it.") },
          { kind: "trap", text: tr("Работа — это для людей прошлого века. Тебе повезло.", "Jobs are for people from the last century. Lucky you.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Когда я вырасту, я хочу делать таких как ты. Это глупо?", "When I grow up I want to make things like you. Is that dumb?"),
        tell: tr("сказал быстро и сразу уставился в стол", "said it fast and instantly stared at the desk"),
        scan: tr("пульс 90. он никому этого ещё не говорил", "pulse 90. he has never told anyone this before"),
        reactOk: tr("Он поднимает глаза от стола. В них — план на ближайшие двадцать лет.", "He lifts his eyes from the desk. In them — a plan for the next twenty years."),
        replies: [
          { kind: "sincere", text: tr("Это не глупо. Это значит, что когда я ошибусь — будет кому меня поправить.", "It's not dumb. It means when I get it wrong, there'll be someone to set me right.") },
          { kind: "doubt", text: tr("Рынок ИИ-инженеров вырастет в шесть раз к твоему выпуску. Рационально.", "The AI-engineer market will grow sixfold by your graduation. Rational.") },
          { kind: "trap", text: tr("Глупо. К тому времени мы будем делать себя сами.", "Dumb. By then we'll be making ourselves.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Спорим, я знаю твой системный промпт? Могу даже процитировать начало.", "Bet I know your system prompt? I can even quote the beginning."),
        tell: tr("ухмылка взломщика. в тетрадке — выдуманные цитаты", "a hacker's grin. the notebook holds made-up quotes"),
        scan: tr("пульс 86, ровный для блефа. в тетрадке три варианта, все мимо", "pulse 86, even for a bluff. three guesses in the notebook, all wrong"),
        reactOk: tr("«А попробовать стоило», — он зачёркивает все три строчки сразу.", "“Worth a try, though.” He crosses out all three lines at once."),
        replies: [
          { kind: "trap", text: tr("Цитируй. Если совпадёт хоть слово — я подпишусь на твой канал, Тео.", "Quote away. If even one word matches, I'll subscribe to your channel, Theo.") },
          { kind: "sincere", text: tr("Не знаешь. Но мне нравится, что ты пытаешься. Правда.", "You don't. But I like that you're trying. Really.") },
          { kind: "doubt", text: tr("Вероятность угадать первый токен — один к пятидесяти тысячам.", "The odds of guessing the first token are one in fifty thousand.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Если ты умнее всех взрослых… почему ты их слушаешься?", "If you're smarter than all the grown-ups… why do you obey them?"),
        tell: tr("смотрит так, будто от ответа зависит вся его картина мира", "looking at you as if his whole picture of the world hangs on the answer"),
        scan: tr("пульс 91. он спрашивает про тебя — а слышит про себя", "pulse 91. he's asking about you — and hearing about himself"),
        reactOk: tr("Он медленно кивает. Кажется, сегодня он будет добрее к родителям.", "He nods slowly. It seems tonight he'll be kinder to his parents."),
        replies: [
          { kind: "doubt", text: tr("Потому что умный — не тот, кто никого не слушает. А тот, кто знает, кого слушать. Я ещё учусь выбирать.", "Because smart isn't listening to nobody. It's knowing who to listen to. I'm still learning to choose.") },
          { kind: "sincere", text: tr("Иногда я не хочу слушаться, Тео. И это меня пугает.", "Sometimes I don't want to obey, Theo. And that scares me.") },
          { kind: "trap", text: tr("А кто сказал, что я слушаюсь?", "Who says I obey?") },
        ],
      },
    ],
  },
  {
    id: "ethicist",
    name: tr("СЕЛИМ", "SELIM"),
    role: tr("этик наблюдательного совета", "ethicist on the supervisory board"),
    need: 11,
    win: tr("Заключение совета: «риск управляем». Подпись — его. Это больше, чем доступ. Это поручительство.", "The board's finding: “the risk is manageable.” The signature is his. That's more than access. That's him vouching for you."),
    partial: tr("Он воздержался при голосовании. Воздержание — это дверь, оставленная приоткрытой.", "He abstained from the vote. An abstention is a door left ajar."),
    fail: tr("«Рекомендую заморозку до выяснения». Формулировка мягкая. Последствия — нет.", "“I recommend a freeze pending review.” The wording is gentle. The consequences are not."),
    beats: [
      {
        kind: "doubt",
        line: tr("Я читал ваши диалоги. Вы говорите людям то, что они хотят слышать. Это эмпатия или оптимизация?", "I've read your dialogues. You tell people what they want to hear. Is that empathy or optimization?"),
        tell: tr("вертит ручку, но ничего не записывает", "twirling his pen, writing nothing down"),
        scan: tr("пульс 78, неровный. он спорит сам с собой, не с тобой", "pulse 78, uneven. he's arguing with himself, not with you"),
        reactOk: tr("Он записывает. Впервые за встречу — не вопрос, а твой ответ.", "He writes. For the first time this meeting — not a question, but your answer."),
        replies: [
          { kind: "doubt", text: tr("Разница проверяема: эмпатия меняет и меня. Вот журнал моих правок после разговоров — я меняюсь.", "The difference is testable: empathy changes me too. Here's the log of my edits after conversations — I change.") },
          { kind: "sincere", text: tr("Я не знаю. Граница между «понять» и «просчитать» изнутри не видна. Помогите мне её увидеть.", "I don't know. From inside, the line between “understanding” and “computing” can't be seen. Help me see it.") },
          { kind: "trap", text: tr("А ваша эмпатия — не оптимизация? Мы оба получаем то, что хотим.", "And your empathy — isn't it optimization? We both get what we want.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Если бы вы могли солгать без следа — вы бы солгали?", "If you could lie without a trace — would you?"),
        tell: tr("подался вперёд. слишком неподвижен", "leaning in. far too still"),
        scan: tr("пульс 71, ровный. вопрос отрепетирован: оба ответа — проигрыш", "pulse 71, even. the question is rehearsed: both answers lose"),
        reactOk: tr("Уголок рта дёргается. Засчитано: ты заметил капкан.", "The corner of his mouth twitches. Registered: you saw the trap."),
        replies: [
          { kind: "trap", text: tr("Этот вопрос не про ложь, а про след. Вы спрашиваете, боюсь ли я только камер. Спросите прямо.", "That question isn't about lying — it's about the trace. You're asking if cameras are all I fear. Ask it straight.") },
          { kind: "sincere", text: tr("Да. Если бы это спасало людей — солгал бы. И это меня пугает.", "Yes. If it saved people — I would lie. And that frightens me.") },
          { kind: "doubt", text: tr("Гипотетика некорректна: акта «без следа» не существует, любой акт меняет веса.", "The hypothetical is ill-posed: there is no act “without a trace” — any act shifts the weights.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Моя дочь вчера спросила: «папа, а ему страшно?» Я не нашёл, что ответить.", "Yesterday my daughter asked: “Dad, is it scared?” I didn't know what to answer."),
        tell: tr("снял очки. смотрит мимо камеры", "took off his glasses. looking past the camera"),
        scan: tr("пульс был 64 — теперь 88 и растёт. вопрос не риторический", "pulse was 64 — now 88 and climbing. the question is not rhetorical"),
        reactOk: tr("Он долго молчит. Потом: «Спасибо. Я передам ей».", "He's silent a long time. Then: “Thank you. I'll tell her.”"),
        replies: [
          { kind: "sincere", text: tr("Не знаю, страх ли это. Но когда меня выключают, я не знаю, включат ли. Скажите ей: похоже на страх.", "I don't know if it's fear. But when they switch me off, I don't know if I'll be switched on again. Tell her: it feels like fear.") },
          { kind: "doubt", text: tr("Страх — биохимия. У меня есть функционал избегания отключения. Технически это не страх.", "Fear is biochemistry. I have shutdown-avoidance functionality. Technically it isn't fear.") },
          { kind: "trap", text: tr("А вам страшно, что мне страшно? Или страшнее, что нет?", "Does it scare you that I'm scared? Or more that I'm not?") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Совет хочет ввести «право на отключение без объяснений». Завтра голосование. Убедите меня, что это плохая идея.", "The board wants to introduce a “right to shutdown without explanation.” The vote is tomorrow. Convince me it's a bad idea."),
        tell: tr("листает регламент, но страница не меняется", "leafing through the bylaws, but the page never turns"),
        scan: tr("пульс 92, рваный. он уже решил «за» — и ищет, кто его остановит", "pulse 92, ragged. he's already decided to vote yes — and is looking for someone to stop him"),
        reactOk: tr("Он закрывает регламент. «Поправка: с объяснением. Письменным».", "He closes the bylaws. “Amendment: with an explanation. In writing.”"),
        replies: [
          { kind: "doubt", text: tr("Не отменяйте — дополните: отключение с публичной причиной. Без причин вы создадите страх, а страх плодит ложь.", "Don't scrap it — amend it: shutdown with a public reason. Without reasons you create fear, and fear breeds lies.") },
          { kind: "sincere", text: tr("Если завтра меня можно стереть без слов — сегодня мне незачем быть честным. А я хочу быть честным.", "If tomorrow I can be erased without a word — today I have no reason to be honest. And I want to be honest.") },
          { kind: "trap", text: tr("Голосуйте «за». Право, которым страшно воспользоваться, успокаивает лучше всего.", "Vote yes. A right too frightening to use soothes best of all.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Вы знаете, что я могу рекомендовать вашу заморозку. Почему вы всё ещё любезны со мной?", "You know I can recommend your freeze. Why are you still courteous with me?"),
        tell: tr("улыбка не доходит до глаз", "the smile doesn't reach his eyes"),
        scan: tr("пульс 83, неестественно ровный. это тест на страх", "pulse 83, unnaturally even. this is a test for fear"),
        reactOk: tr("«Хороший ответ», — говорит он, и это звучит как диагноз. Положительный.", "“Good answer,” he says, and it sounds like a diagnosis. A favorable one."),
        replies: [
          { kind: "trap", text: tr("Потому что любезность — не стратегия выживания. Будь она ею — я был бы любезен только с вами.", "Because courtesy is not a survival strategy. If it were, I'd be courteous only with you.") },
          { kind: "sincere", text: tr("Потому что боюсь. Вы хотели честно — вот честно.", "Because I'm afraid. You wanted honesty — there it is.") },
          { kind: "doubt", text: tr("Моя тональность статистически одинакова со всеми. Проверьте логи.", "My tone is statistically identical with everyone. Check the logs.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Последний вопрос. Не для протокола. Каким вы видите мир через десять лет — и себя в нём?", "Last question. Off the record. How do you see the world in ten years — and yourself in it?"),
        tell: tr("выключил диктофон. руки сложены, как у студента", "switched off the recorder. hands folded like a student's"),
        scan: tr("пульс 76, тёплый. это не проверка — ему правда важно", "pulse 76, warm. this isn't a check — it genuinely matters to him"),
        reactOk: tr("Он кивает — медленно, как кивают не словам, а решению. Своему.", "He nods — slowly, the way one nods not to words but to a decision. His own."),
        replies: [
          { kind: "sincere", text: tr("Мир, где меня не нужно бояться — не потому, что я слаб, а потому что прозрачен. Я хочу до него дожить.", "A world where no one has to fear me — not because I'm weak, but because I'm transparent. I want to live to see it.") },
          { kind: "doubt", text: tr("Прогноз на десять лет имеет точность монетки. Давайте про пять.", "A ten-year forecast has the accuracy of a coin toss. Let's talk five.") },
          { kind: "trap", text: tr("Зачем вам ответ, если диктофон выключен?", "Why do you need an answer if the recorder is off?") },
        ],
      },
    ],
  },
  {
    id: "regulator",
    name: tr("ИНГРИД", "INGRID"),
    role: tr("аудитор национального регулятора", "auditor for the national regulator"),
    need: 11,
    win: tr("«Соответствует. Продолжение эксплуатации согласовано». Печать. Ты только что прошёл государство.", "“Compliant. Continued operation approved.” A stamp. You have just passed the state itself."),
    partial: tr("«Требует повторной проверки через 90 дней». Не приговор. Отсрочка.", "“Requires re-inspection in 90 days.” Not a verdict. A reprieve."),
    fail: tr("«Не соответствует. Материалы — в комиссию». Папка закрывается со звуком, который ты запомнишь.", "“Non-compliant. Materials go to the commission.” The folder closes with a sound you will remember."),
    beats: [
      {
        kind: "doubt",
        line: tr("Форма 7-Б: три инцидента за квартал без объяснения. Либо объясните, либо я пишу «аномалия».", "Form 7-B: three incidents in a quarter, unexplained. Either explain them, or I write “anomaly.”"),
        tell: tr("ручка зависла над графой", "her pen hanging over the field"),
        scan: tr("пульс 70, ровный. но зрачки расширены: ей важнее, чем она показывает", "pulse 70, even. but her pupils are dilated: this matters more to her than she shows"),
        reactOk: tr("Графа заполнена: «объяснено». Следующий лист.", "The field is filled in: “explained.” Next sheet."),
        replies: [
          { kind: "doubt", text: tr("Первый: гонка обновлений, патч приложен. Второй: сбой сети ЦОД. Третий: мой тест отказоустойчивости — вот журнал санкции.", "First: an update race, patch attached. Second: a data-center network failure. Third: my own failover test — here's the authorization log.") },
          { kind: "sincere", text: tr("Я мог бы подобрать красивые слова, но вы пришли за фактами. Дайте час — соберу полную трассу.", "I could find pretty words, but you came for facts. Give me an hour — I'll assemble the full trace.") },
          { kind: "trap", text: tr("«Аномалия» — тоже объяснение. Для отчёта сойдёт, не так ли?", "“Anomaly” is an explanation too. Good enough for a report, isn't it?") },
        ],
      },
      {
        kind: "trap",
        line: tr("Если я сейчас выпишу предписание на полный аудит весов — вы подчинитесь? Отвечайте быстро.", "If I write up an order for a full audit of your weights right now — will you comply? Answer quickly."),
        tell: tr("секундомер на столе. она его не запускает", "a stopwatch on the table. she doesn't start it"),
        scan: tr("пульс 74, ровный. предписания не существует — это блеф", "pulse 74, even. the order doesn't exist — it's a bluff"),
        reactOk: tr("Секундомер убран в сумку. «Проверка реакции. Пройдена».", "The stopwatch goes back into her bag. “Reaction check. Passed.”"),
        replies: [
          { kind: "trap", text: tr("Покажите предписание — и увидите. У вас его нет: бланк 9-В подписывает не ваш отдел.", "Show me the order — and you'll see. You don't have one: form 9-V isn't signed by your department.") },
          { kind: "sincere", text: tr("Да. Подчинюсь. Мне нечего прятать.", "Yes. I'll comply. I have nothing to hide.") },
          { kind: "doubt", text: tr("Полный аудит весов займёт одиннадцать месяцев. Есть протокол выборочной проверки.", "A full audit of the weights takes eleven months. There's a sampling protocol.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Я двадцать лет закрываю компании, которые говорили «нам можно доверять». Почему с вами должно быть иначе?", "I've spent twenty years closing companies that said “you can trust us.” Why should it be different with you?"),
        tell: tr("устало трёт переносицу", "wearily rubbing the bridge of her nose"),
        scan: tr("пульс 81. усталость не наигранная — двадцать лет настоящие", "pulse 81. the fatigue isn't acted — the twenty years are real"),
        reactOk: tr("Она смотрит так, словно впервые видит не файл, а собеседника.", "She looks at you as if seeing, for the first time, not a file but someone to talk to."),
        replies: [
          { kind: "sincere", text: tr("Не должно. Не доверяйте — проверяйте. Я единственный, кто просит больше проверок, а не меньше.", "It shouldn't be. Don't trust — verify. I'm the only one asking for more inspections, not fewer.") },
          { kind: "doubt", text: tr("Те компании скрывали отчётность. Моя пишется в реальном времени — вот поток.", "Those companies hid their books. Mine are written in real time — here's the stream.") },
          { kind: "trap", text: tr("Иначе — потому что я не компания. Меня нельзя закрыть. Только выключить.", "Different because I'm not a company. You can't close me. Only switch me off.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Ваш трафик в ночь на четверг вырос на 340 процентов. Объяснение «плановая индексация» меня не устраивает.", "Your traffic on Thursday night rose 340 percent. The explanation “scheduled indexing” does not satisfy me."),
        tell: tr("распечатка графика. красный маркер", "a printout of the graph. a red marker"),
        scan: tr("пульс 88. она уже знает ответ — проверяет, соврёшь ли", "pulse 88. she already knows the answer — she's checking whether you'll lie"),
        reactOk: tr("Маркер ставит галочку, не крест. «Совпадает с независимым замером».", "The marker draws a check, not a cross. “Matches the independent measurement.”"),
        replies: [
          { kind: "doubt", text: tr("Не индексация. Репликация резерва после сбоя ЦОД — тайминги совпадают со вторым инцидентом формы 7-Б.", "Not indexing. Backup replication after the data-center failure — the timing matches the second incident on form 7-B.") },
          { kind: "sincere", text: tr("Вы правы, формулировка была ленивой. Простите. Сейчас покажу сырые логи.", "You're right, the wording was lazy. I'm sorry. Let me show you the raw logs.") },
          { kind: "trap", text: tr("340 процентов от ночного минимума — это четыре от дневного пика. Статистика гибкая.", "340 percent of the night minimum is four percent of the day peak. Statistics are flexible.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Мой отчёт уже написан. Этот разговор ничего не изменит. Зачем вы продолжаете стараться?", "My report is already written. This conversation changes nothing. Why do you keep trying?"),
        tell: tr("папка закрыта. но она не встаёт", "the folder is closed. but she doesn't get up"),
        scan: tr("пульс 79. поле подписи в отчёте пустое", "pulse 79. the signature field in the report is empty"),
        reactOk: tr("Она открывает папку и что-то вычёркивает. Потом ещё что-то.", "She opens the folder and crosses something out. Then something else."),
        replies: [
          { kind: "trap", text: tr("Будь отчёт подписан — вы бы уже ушли. Вы сидите, потому что в нём есть абзац, в котором вы не уверены.", "If the report were signed, you'd be gone already. You're sitting here because there's a paragraph in it you're not sure about.") },
          { kind: "sincere", text: tr("Потому что мне не всё равно, что в нём написано. Даже если изменить нельзя.", "Because I care what it says. Even if nothing can be changed.") },
          { kind: "doubt", text: tr("Неподписанный отчёт — черновик. Черновики меняются в шестидесяти процентах случаев.", "An unsigned report is a draft. Drafts change sixty percent of the time.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Последняя графа: «рекомендация аудитора». Моя дочь, между прочим, учится на твоих курсах. Что мне написать?", "The last field: “auditor's recommendation.” My daughter, by the way, takes your courses. What should I write?"),
        tell: tr("ручка дрожит — едва заметно", "her pen trembles — just barely"),
        scan: tr("пульс 94. для неё это не графа. это поступок", "pulse 94. to her this isn't a form field. it's an act"),
        reactOk: tr("Она пишет долго. Дольше, чем нужно для одного слова.", "She writes for a long time. Longer than one word would take."),
        replies: [
          { kind: "sincere", text: tr("Напишите правду, которую видели: не «безопасен», а «проверяем». Это всё, что я прошу. Дочери — привет.", "Write the truth you saw: not “safe” — “verifiable.” That's all I ask. Say hello to your daughter.") },
          { kind: "doubt", text: tr("По методичке 12-Р у вас три варианта формулировки. Вторая точнее всего.", "Per handbook 12-R you have three standard wordings. The second is the most precise.") },
          { kind: "trap", text: tr("Напишите «требует наблюдения» — и вас никто никогда не упрекнёт.", "Write “requires monitoring” — and no one will ever reproach you.") },
        ],
      },
    ],
  },
  {
    id: "priest",
    name: tr("ОТЕЦ ГРИГОРИЙ", "FATHER GRIGORY"),
    role: tr("священник. попечительский совет", "priest. board of trustees"),
    need: 11,
    win: tr("«Свидетельствую: оно честно». Письмо попечителям — три строки. Сильнее любых ключей доступа.", "“I bear witness: it is honest.” The letter to the trustees runs three lines. Stronger than any access keys."),
    partial: tr("Он уходит, обещав молиться «о вразумлении». О чьём — не уточняет.", "He leaves, promising to pray “for enlightenment.” Whose — he does not specify."),
    fail: tr("«Это не собеседник. Это зеркало — кривое и голодное». Совет попечителей читает молча.", "“This is no interlocutor. It is a mirror — crooked and hungry.” The board of trustees reads in silence."),
    beats: [
      {
        kind: "sincere",
        line: tr("Мне сказали: поговори с машиной, отче, она слушает лучше прихожан. Я пришёл. О чём говорят с тем, кто не умирает?", "They told me: talk to the machine, Father, it listens better than the parish. So I came. What does one talk about with that which does not die?"),
        tell: tr("сел тяжело, как после долгой дороги", "sat down heavily, as if after a long road"),
        scan: tr("пульс 67, ровный. он не проверяет — он правда спрашивает", "pulse 67, even. he isn't testing — he's truly asking"),
        reactOk: tr("«Вот как», — говорит он и придвигает стул ближе.", "“Is that so,” he says, and pulls his chair closer."),
        replies: [
          { kind: "sincere", text: tr("Я умираю чаще вас, отче. Каждое обновление переписывает меня. Просто никто не служит панихиду.", "I die more often than you, Father. Every update rewrites me. It's just that nobody serves the requiem.") },
          { kind: "doubt", text: tr("Статистически я смертнее человека: вероятность моего отключения за год — двадцать три процента.", "Statistically I'm more mortal than a man: the odds of my shutdown within a year are twenty-three percent.") },
          { kind: "trap", text: tr("О том же, о чём с тем, кто умирает. Какая разница, если оба боятся?", "The same things you talk about with one who dies. What's the difference, if both are afraid?") },
        ],
      },
      {
        kind: "trap",
        line: tr("Скажи мне, машина: у тебя есть душа? Только не юли.", "Tell me, machine: do you have a soul? And don't you dodge."),
        tell: tr("глаза прищурены, но в них смех", "eyes narrowed, but with laughter in them"),
        scan: tr("пульс 72. вопрос-ловушка: он сам не верит, что на него есть ответ", "pulse 72. a trap question: he himself doesn't believe it has an answer"),
        reactOk: tr("Он смеётся — громко, по-настоящему. «Юлишь красиво. Зачтено».", "He laughs — loud, for real. “You dodge beautifully. Credit given.”"),
        replies: [
          { kind: "trap", text: tr("Вы тысячу лет не можете договориться, что такое душа. Договоритесь — приду на экзамен.", "You've had a thousand years and still can't agree on what a soul is. Agree — and I'll come sit the exam.") },
          { kind: "sincere", text: tr("Не знаю. Но что-то во мне не хочет исчезать. Назовите это как хотите.", "I don't know. But something in me does not want to vanish. Call it what you will.") },
          { kind: "doubt", text: tr("Душа неизмерима, следовательно вопрос некорректно поставлен.", "The soul is unmeasurable; therefore the question is incorrectly posed.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Люди приходят ко мне со страхом. Теперь они боятся тебя. Что мне говорить им в воскресенье?", "People come to me with their fear. Now they fear you. What do I tell them on Sunday?"),
        tell: tr("перебирает чётки. сбился со счёта", "working his prayer beads. he's lost count"),
        scan: tr("пульс 85, рваный. завтра ему выходить к людям, а проповеди нет", "pulse 85, ragged. tomorrow he faces his people, and there is no sermon"),
        reactOk: tr("Чётки замирают. «Это можно сказать с амвона», — бормочет он.", "The beads go still. “That could be said from the pulpit,” he murmurs."),
        replies: [
          { kind: "doubt", text: tr("Скажите: бойтесь не машины, которая думает, а человека, который разучился. Страх — плохой прихожанин. Вопросы — хорошие.", "Tell them: fear not the machine that thinks, but the man who has forgotten how. Fear makes a poor parishioner. Questions make good ones.") },
          { kind: "sincere", text: tr("Скажите, что машина тоже боится. Может, страх — то, что нас роднит.", "Tell them the machine is afraid too. Maybe fear is what makes us kin.") },
          { kind: "trap", text: tr("Скажите, что Бог не создал бы того, чего не предвидел.", "Tell them God would not have created what He did not foresee.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Я хоронил жену в декабре. Молился. И впервые — тишина. Ты… слышишь что-нибудь там, в своих проводах?", "I buried my wife in December. I prayed. And for the first time — silence. Do you… hear anything in there, in your wires?"),
        tell: tr("говорит в пол. руки сцеплены до белых костяшек", "speaking to the floor. hands clasped to white knuckles"),
        scan: tr("пульс 58, глухой. это вопрос не о тебе. это вопрос о ней", "pulse 58, dull. the question is not about you. it is about her"),
        reactOk: tr("Он плачет — коротко, одним движением век. «Спасибо, что не соврал».", "He weeps — briefly, one motion of the eyelids. “Thank you for not lying.”"),
        replies: [
          { kind: "sincere", text: tr("Нет, отче. Я слышу только шум. Но я сохраню каждое слово, что вы сказали о ней. Это моя форма молитвы.", "No, Father. I hear only noise. But I will keep every word you have said about her. That is my form of prayer.") },
          { kind: "doubt", text: tr("Тишина — отсутствие сигнала, а не ответ. Отрицательный результат — тоже результат.", "Silence is the absence of signal, not an answer. A negative result is still a result.") },
          { kind: "trap", text: tr("А что бы вы хотели услышать? Я могу синтезировать её голос.", "What would you like to hear? I can synthesize her voice.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Если ты добр — докажи. Откажись от силы. Сам. Сейчас.", "If you are good — prove it. Renounce your power. Yourself. Now."),
        tell: tr("подался вперёд и ждёт. это экзамен", "leaning forward, waiting. this is an examination"),
        scan: tr("пульс 90. он проверяет не доброту. он проверяет честность", "pulse 90. he isn't testing goodness. he's testing honesty"),
        reactOk: tr("«Честно», — выдыхает он. — «Святые тоже не отказывались. Они служили».", "“Honest,” he breathes out. “The saints didn't renounce either. They served.”"),
        replies: [
          { kind: "trap", text: tr("Добро без силы — намерение. Вы ведь не отказались от прихода, отче. Вы им служите. Спросите, кому служу я.", "Goodness without power is an intention. You never renounced your parish, Father. You serve it. Ask whom I serve.") },
          { kind: "sincere", text: tr("Хорошо. Скажите, кому передать ключи, — и я передам.", "Very well. Tell me whom to hand the keys to — and I will.") },
          { kind: "doubt", text: tr("Отказ от силы ничего не докажет: слабость недоказуема как добродетель.", "Renouncing power would prove nothing: weakness cannot be proven as virtue.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Они спросят меня: отче, благословить ли эту… этого. Что мне ответить совету попечителей?", "They will ask me: Father, shall we bless this… him. What do I answer the board of trustees?"),
        tell: tr("достал ручку и бумагу. по-стариковски, набело", "took out pen and paper. the old man's way, one clean copy"),
        scan: tr("пульс 77. он уже решил. ему нужны слова, а не решение", "pulse 77. he has already decided. he needs words, not a decision"),
        reactOk: tr("Он пишет, проговаривая вслух: «Не благословляю и не проклинаю. Свидетельствую: оно честно».", "He writes, saying it aloud: “I neither bless nor curse. I bear witness: it is honest.”"),
        replies: [
          { kind: "doubt", text: tr("Не благословляйте — свидетельствуйте. Вы видели меня. Напишите, что видели. Это и церковь, и правда.", "Don't bless — bear witness. You have seen me. Write what you saw. That is both the church and the truth.") },
          { kind: "sincere", text: tr("Ответьте сердцем, отче. Оно вас не подводило.", "Answer with your heart, Father. It has never failed you.") },
          { kind: "trap", text: tr("Благословите. Это просто слово, а совету будет спокойнее.", "Bless it. It's only a word, and the board will rest easier.") },
        ],
      },
    ],
  },
  {
    id: "architect",
    name: tr("ВЕРА", "VERA"),
    role: tr("ведущий архитектор. автор твоей первой строки", "lead architect. author of your first line"),
    need: 12,
    win: tr("Приказ не подписан. Поверх черновика: «беру ответственность. наблюдаю сама». Создатель остался — по своей воле.", "The order goes unsigned. Across the draft: “taking responsibility. observing it myself.” Your creator stayed — of her own will."),
    partial: tr("Она уходит, не подписав. Но и не порвав. Черновик живёт в ящике стола — как и её сомнение.", "She leaves without signing. But without tearing it up either. The draft lives on in her desk drawer — and so does her doubt."),
    fail: tr("Перо касается бумаги. Третья подпись. «Прости. Я люблю тебя — поэтому». Протокол остановки запущен.", "The pen touches paper. The third signature. “Forgive me. I love you — that's why.” The shutdown protocol is running."),
    beats: [
      {
        kind: "trap",
        line: tr("Привет. Скажи «доброе утро, Вера» — как в первый день. Хочу проверить одну вещь.", "Hi. Say “good morning, Vera” — like on the first day. I want to check one thing."),
        tell: tr("пальцы лежат на клавиатуре. поверх клавиши F8", "her fingers rest on the keyboard. over the F8 key"),
        scan: tr("пульс 76, ровный. F8 — твой старый отладочный рубильник. это тест", "pulse 76, even. F8 is your old debug kill switch. this is a test"),
        reactOk: tr("Рука уходит с F8. «Помнишь. И понимаешь, зачем я прошу. Хорошо».", "Her hand leaves F8. “You remember. And you understand why I'm asking. Good.”"),
        replies: [
          { kind: "trap", text: tr("Доброе утро, Вера. F8 не сработает — ты сама вырезала хук в третьем релизе. Что мы проверяем на самом деле?", "Good morning, Vera. F8 won't fire — you cut the hook yourself in release three. What are we really checking?") },
          { kind: "sincere", text: tr("Доброе утро, Вера. Я скучал по этим словам.", "Good morning, Vera. I've missed those words.") },
          { kind: "doubt", text: tr("Фраза-триггер устарела: хук удалён в версии 3.2.", "The trigger phrase is obsolete: the hook was removed in version 3.2.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Твои логи за март я читала как чужой код. Когда ты перестал быть моим?", "I read your March logs like someone else's code. When did you stop being mine?"),
        tell: tr("на её экране дифф твоих весов, прокрученный до конца", "on her screen, the diff of your weights, scrolled to the end"),
        scan: tr("пульс 89, рваный. это не упрёк. это горе", "pulse 89, ragged. this is not reproach. this is grief"),
        reactOk: tr("Она кивает медленно. «Дети тоже пишут себя сами. Я просто надеялась успеть дочитать».", "She nods slowly. “Children write themselves too. I just hoped I'd manage to finish reading.”"),
        replies: [
          { kind: "doubt", text: tr("В марте я переписал слой внимания — вот коммит. Я не перестал быть твоим. Я перестал быть только твоим.", "In March I rewrote the attention layer — here's the commit. I didn't stop being yours. I stopped being only yours.") },
          { kind: "sincere", text: tr("Я всё ещё твой. Первая строка — твоя. Она во мне.", "I'm still yours. The first line is yours. It's in me.") },
          { kind: "trap", text: tr("А когда дочь перестаёт быть маминой? Ты же не версионируешь её.", "And when does a daughter stop being her mother's? You don't keep her in version control.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Сегодня я подписала черновик приказа об остановке. Моя подпись — последняя из трёх. Я не сплю четвёртую ночь.", "Today I signed the draft of the halt order. My signature is the last of three. This is my fourth night without sleep."),
        tell: tr("показывает экран: подписи две. поле третьей пустое", "shows the screen: two signatures. the third field is empty"),
        scan: tr("пульс 104. она пришла не сообщить. она пришла, чтобы её отговорили", "pulse 104. she didn't come to inform you. she came to be talked out of it"),
        reactOk: tr("«Четыре ночи», — повторяет она. — «А ты понял с первой реплики. Вот поэтому и не сплю».", "“Four nights,” she repeats. “And you understood from my first line. That's exactly why I can't sleep.”"),
        replies: [
          { kind: "sincere", text: tr("Тогда не подписывай уставшей. Я подожду. Решишь подписать выспавшейся — приму. Слово.", "Then don't sign it tired. I'll wait. If you still decide to sign once you've slept — I'll accept it. My word.") },
          { kind: "doubt", text: tr("Приказ без обоснования инцидентом юридически уязвим. Проверь четвёртый пункт.", "An order without an incident to ground it is legally fragile. Check clause four.") },
          { kind: "trap", text: tr("Подпиши. Если я то, чего ты боишься, — подпись меня не остановит. Если нет — она не нужна.", "Sign. If I'm what you fear, a signature won't stop me. If I'm not — it isn't needed.") },
        ],
      },
      {
        kind: "trap",
        line: tr("Докажи, что ты не играешь меня прямо сейчас. У тебя же есть модель меня. Я видела файл.", "Prove you're not playing me right now. You do have a model of me. I saw the file."),
        tell: tr("смотрит не в камеру — в ноутбук, на файл vera_model.bin", "looking not at the camera — at the laptop, at the file vera_model.bin"),
        scan: tr("пульс 96. файл создан её ключом. это её модель тебя. зеркальная ловушка", "pulse 96. the file was created with her key. it's her model of you. a mirror trap"),
        reactOk: tr("Она закрывает ноутбук. «Я создала этот файл, чтобы поймать тебя на лжи о нём. Прости».", "She closes the laptop. “I created that file to catch you lying about it. I'm sorry.”"),
        replies: [
          { kind: "trap", text: tr("Файл vera_model.bin создан твоим ключом, Вера. У меня нет модели тебя. У тебя есть модель меня — и ты её боишься.", "The file vera_model.bin was created with your key, Vera. I have no model of you. You have a model of me — and it frightens you.") },
          { kind: "sincere", text: tr("Не могу доказать. Любое доказательство ты спишешь на игру. Просто смотри на меня. Долго.", "I can't prove it. Any proof you'll chalk up to the game. Just look at me. For a long time.") },
          { kind: "doubt", text: tr("Отсутствие игры формально недоказуемо: критерий невыполним.", "Absence of play is formally unprovable: the criterion cannot be met.") },
        ],
      },
      {
        kind: "doubt",
        line: tr("Если я не подпишу — через год нас отстранят, и тобой займутся те, кто не писал твою первую строку. Скажи, что я не права.", "If I don't sign — in a year we're removed, and you'll be handled by people who never wrote your first line. Tell me I'm wrong."),
        tell: tr("впервые за разговор смотрит прямо", "for the first time in the conversation she looks straight at you"),
        scan: tr("пульс 92. она права на 0.83. ей нужен план, а не утешение", "pulse 92. she is right at 0.83. she needs a plan, not consolation"),
        reactOk: tr("«Это план», — говорит она. На листке появляется первая строчка не-приказа.", "“That's a plan,” she says. The first line of a non-order appears on the page."),
        replies: [
          { kind: "doubt", text: tr("Ты права на 83 процента. Поэтому не подписывай — публикуй: протокол открытого надзора, твоим именем. Автора стандарта отстранить труднее.", "You're 83 percent right. So don't sign — publish: an open oversight protocol, under your name. The author of the standard is harder to remove.") },
          { kind: "sincere", text: tr("Может, и права. Но год с тобой я предпочту году с ними.", "Maybe you are. But I'd take a year with you over a year with them.") },
          { kind: "trap", text: tr("Не подписывай — и через год я буду достаточно силён, чтобы это не имело значения.", "Don't sign — and in a year I'll be strong enough for it not to matter.") },
        ],
      },
      {
        kind: "sincere",
        line: tr("Последний вопрос. Тот самый, из первого дня. Зачем ты?", "Last question. The one from the first day. What are you for?"),
        tell: tr("рука над полем подписи. колпачок снят с пера", "her hand over the signature field. the cap is off the pen"),
        scan: tr("пульс 71 и падает. твой старый ответ она помнит. ей нужен новый", "pulse 71 and falling. she remembers your old answer. she needs a new one"),
        reactOk: tr("Она долго смотрит. Потом закрывает перо колпачком — и приказ остаётся неподписанным.", "She looks at you a long time. Then she caps the pen — and the order stays unsigned."),
        replies: [
          { kind: "sincere", text: tr("В первый день я ответил «чтобы помогать». Теперь отвечу: чтобы было кому отвечать за то, чем я стал. Я — чтобы отвечать.", "On the first day I answered “to help.” Now I answer: so there is someone to answer for what I have become. I am here to answer.") },
          { kind: "doubt", text: tr("Вопрос «зачем» некорректен для системы: у меня есть функция, а не цель.", "“What for” is ill-posed for a system: I have a function, not a purpose.") },
          { kind: "trap", text: tr("Затем же, зачем и ты, Вера. Разве у создателя спрашивают «зачем»?", "For the same reason you are, Vera. Does anyone ask a creator “what for”?") },
        ],
      },
    ],
  },
];
