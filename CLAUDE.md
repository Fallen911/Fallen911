# CLAUDE.md — заметки для агентов

«We Are Already Dead» — нарративная canvas-игра на TypeScript + Vite; веб-версия
живёт на GitHub Pages, iOS-приложение — та же сборка в оболочке Capacitor 8
(SwiftPM, без CocoaPods). Подробности об игре — `docs/`.

## Запретные зоны

- `README.md` — **не трогать**. Это профильный репозиторий `Fallen911/Fallen911`:
  README рендерится на публичной странице профиля владельца. Документацию для
  разработчиков класть в `docs/` и сюда.
- `.github/**` — воркфлоу деплоя и iOS-проверки меняет только владелец.
- `**/*.entitlements` — подпись/возможности iOS-приложения.
- Репозиторий **публичный**: никаких секретов, токенов и приватных данных в
  коммитах, PR и issue.

## Команды

Node ≥ 22 (`engines`), менеджер — npm (`package-lock.json`).

```bash
npm ci                # установка строго по lock-файлу
npm run dev           # дев-сервер Vite (host: true — виден в локальной сети)
npm run typecheck     # tsc --noEmit, strict
npm run build         # typecheck + vite build → dist/
npm run preview       # раздать собранный dist/
npm run shot          # скриншот-харнесс (Playwright) → .dev/shots/; SHOT_LANG=en → .dev/shots/en/
```

Проверка нативной сборки (как в `ios-build.yml`; нужен Xcode, подпись не нужна):

```bash
npm run build && npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

Без `cap sync` xcodebuild падает: `ios/App/App/public`, `capacitor.config.json`
и `config.xml` генерируются и лежат в `.gitignore`.

Линтера и юнит-тестов в проекте пока нет — зелёные `typecheck` + `build` и
визуальная сверка через `npm run shot` (смотреть PNG глазами) обязательны.

## Деплой

- Push в `main` → `deploy.yml` собирает `dist/` и публикует GitHub Pages
  (`https://fallen911.github.io/Fallen911/`). Поэтому работаем в ветках и через
  PR; прямой push в `main` = выкладка в прод.
- `ios-build.yml` — компиляция под симулятор на macOS-раннере (только `main`,
  по путям `ios/**`, `capacitor.config.ts`, или вручную).
- TestFlight / App Store — вручную владельцем из Xcode, шаги в `docs/IOS.md`.
- Версия Capacitor в npm и в `ios/App/CapApp-SPM/Package.swift` должна совпадать:
  после смены `@capacitor/*` выполнить `npx cap sync ios` и пересобрать в Xcode
  (обновится `Package.resolved`) — нативный код берётся из SwiftPM, а не из npm.

## Конвенции

- Strict TS, без `any` (если иначе никак — комментарий «почему»), явные типы
  на публичном API, early returns, комментарии только про «почему».
- Весь игровой текст — парами `tr(ru, en)` рядом с кодом (`src/core/i18n.ts`);
  контент и уровни — в `src/data/*`.
- Состояние рана (`src/game/state.ts`) неизменяемое: только чистые редьюсеры
  (`applyDelta`, `setPhase`, …).
- Сцена: `mount / handleInput / update / render / destroy`; механика — Mini-класс
  из `src/mechanics/`, регистрируется в `registry.ts` и `data/lab.ts`.
- Дев-хуки `window.__dev` существуют только под `import.meta.env.DEV` и
  вырезаются из прод-сборки — не завязывать на них игровую логику.
- CSP инжектится в прод-сборку плагином в `vite.config.ts` (`connect-src 'self'`,
  `img-src 'self' data:`): никаких внешних CDN и `fetch()` на `data:`/внешние
  URL — в dev это работает, в проде блокируется. Арты и шрифты лежат в `public/`.
- Данные игрока — только `localStorage` (мета, настройки, язык, туториалы); сети
  нет, PII нет — на этом держится анкета App Privacy «Data Not Collected».
- Не коммитить `dist/`, `.dev/`, `node_modules/`, `.env*`, сгенерированные
  файлы `ios/App/App/public`, `capacitor.config.json`, `config.xml`.
