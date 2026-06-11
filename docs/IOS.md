# iOS: от Мака до App Store

Пошаговый маршрут для владельца с **платным** Apple Developer аккаунтом.
Каждый шаг занимает минуты; всё, что дольше, — ожидание Apple.

Подпись платного аккаунта живёт год (никаких переподписей раз в 7 дней),
лимита на количество приложений нет.

## 0. Предпосылки (один раз)

- Mac с свежим **Xcode** (App Store) — после установки открой его раз, чтобы он доставил компоненты.
- **CocoaPods**: `brew install cocoapods`.
- Apple ID платного аккаунта подключён к Xcode: **Xcode → Settings → Accounts → «+» → Apple ID**. В списке появится твоя команда (Team).

## 1. Проект

```bash
git clone https://github.com/Fallen911/Fallen911 && cd Fallen911
npm install
npm i @capacitor/haptics      # нативная гаптика (хук в core/haptics.ts уже ждёт её)
npm run ios:add               # один раз: создаёт нативный проект ios/
npm run ios                   # собирает веб, синхронизирует, открывает Xcode
```

Арты уже в бандле (`public/bg/`) — игра работает офлайн из коробки.

## 2. Подпись (Signing & Capabilities)

1. В левой панели Xcode кликни верхний синий значок **App** → в центре **TARGETS → App** (не PROJECT).
2. Вкладка **Signing & Capabilities** → галка **Automatically manage signing** → **Team** = твоя команда.
3. **Bundle Identifier** уже задан: `com.fallen911.wearealreadydead` (из `capacitor.config.ts`). Если Apple скажет «занят» — добавь суффикс, но тогда тот же ID используй и в App Store Connect.

Готово, когда под Team нет красного и написано «Xcode Managed Profile».

## 3. Иконка

**App → App → Assets → AppIcon** → перетащи `public/icons/icon-1024.png` из Finder в слот 1024×1024. Если слотов много — в правой панели переключи на **Single Size**, остальные размеры Xcode нарежет сам.

## 4. Прогон на своём iPhone

1. iPhone кабелем к Маку → на телефоне «Доверять этому компьютеру».
2. **Режим разработчика** (iOS 16+): Настройки → Конфиденциальность и безопасность → Режим разработчика → вкл → перезагрузка. (Пункт появляется, когда Xcode увидел устройство.)
3. В выпадашке устройств наверху Xcode выбери свой iPhone → **▶** (⌘R). Первая сборка — несколько минут.
4. Симулятору подпись не нужна вообще — для быстрых проверок выбирай «iPhone 16 Pro», но гаптику и реальную плавность видно только на железе.

Если всплывёт «Ненадёжный разработчик»: Настройки → Основные → VPN и управление устройством → твой профиль → Доверять.

## 5. Один ключ в Info.plist (избавляет от вопроса про шифрование)

В Xcode открой **App → App → Info.plist** → «+» → ключ
`ITSAppUsesNonExemptEncryption` = **NO**.
Игра своей криптографии не использует; с этим ключом App Store Connect перестаёт спрашивать про экспорт шифрования на каждом билде.

## 6. Запись приложения в App Store Connect (один раз)

[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps → «+» → New App**:
платформа iOS, имя **We Are Already Dead**, основной язык, **Bundle ID** из шага 2 (после первой подписи он уже зарегистрирован под твоей командой; если в списке нет — добавь на developer.apple.com → Identifiers), SKU — любая строка (`wearealreadydead`).

## 7. Загрузка билда

1. В выпадашке устройств выбери **Any iOS Device (arm64)** — для симулятора архив не собирается.
2. **Product → Archive** → откроется Organizer (если нет: Window → Organizer).
3. Выбери архив → **Distribute App → App Store Connect → Upload** → везде дефолты.
4. 10–60 минут обработки, придёт письмо.

## 8. TestFlight

Вкладка **TestFlight** в App Store Connect → билд появился после обработки.

- **Internal Testing**: создай группу, добавь себя (до 100 человек, без ревью). На iPhone поставь приложение TestFlight и прими приглашение.
- **External Testing**: до 10 000 тестеров, требует лёгкого Beta App Review (~день).

## 9. Карточка App Store

На вкладке App Store заполни и отправь:

- **Скриншоты** дисплея 6.9"/6.7": запусти игру в симуляторе iPhone Pro Max, ⌘S сохраняет PNG нужного размера.
- Описание, ключевые слова, категория (Games).
- **Privacy Policy URL**: `https://fallen911.github.io/Fallen911/privacy.html` (страница в репо: `public/privacy.html`).
- **App Privacy** анкета → **Data Not Collected** (прогресс только в localStorage, сети нет).
- Возрастной рейтинг (анкета), цена (Free).
- **Add for Review** → ревью обычно 1–2 дня.

## Грабли

| Симптом | Лечение |
|---|---|
| «Failed to register bundle identifier» | ID занят — суффикс в Bundle Identifier и тот же ID в App Store Connect |
| Pod-ошибки при `npm run ios` | `cd ios/App && pod install --repo-update` |
| Билд не появился в TestFlight | подожди письмо об обработке; проверь Activity на предмет missing compliance — лечится ключом из шага 5 |
| Иконка «пустая» на устройстве | слот 1024 в AppIcon пуст или формат не PNG без альфы — пересохрани `icon-1024.png` |
