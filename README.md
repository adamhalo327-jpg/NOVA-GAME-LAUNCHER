# NOVA GAME LAUNCHER 2.0 — GAME LIBRARY PLUS

Windows 10/11 Electron application. Upgrade of stable 1.0.1.

## Implemented in 2.0
- Add / launch / remove Windows EXE or HTTP(S) browser games.
- Local library, favorites, recent, search and sort.
- **New:** custom game covers (PNG/JPG/WEBP up to 1.5MB), category editing and filtering.
- **New:** edit game names without losing launch counts.
- **New:** local nickname and four accent themes (purple, blue, red, gold).
- **New:** six automatically unlocked local achievements.
- Library JSON export and preserved `games.json` app storage; installed upgrade maintains the previous app ID and data folder.

## Known scope
- Local profiles only; no external account service.
- Launch counts are recorded; precise hours played and automatic game updates are **not** implemented in this version.
- Adding EXEs is a user-initiated action; only run executables you trust.
- Installer files are unsigned, so Windows SmartScreen may warn.

## Build on GitHub Actions
1. Unpack this ZIP and upload **its contents** to repository root, including hidden `.github/workflows`.
2. Commit and push to `main`.
3. In Actions run `Build NOVA GAME LAUNCHER EXE` (or let the push trigger it).
4. Download Artifacts: `NOVA-GAME-LAUNCHER-2.0-Windows`.

## Local development
```sh
npm install
npm run check
npm test
npm start
npm run dist
```

Do not place a nested project folder above `src/`, `package.json`, and `.github/`.


## Licznik czasu gry (dodany do 2.0)
- Windows EXE: pomiar działa od uruchomienia programu przez NOVA do zakończenia procesu uruchomionego EXE.
- Wynik jest zapisywany w `games.json` co około 5 sekund, także po zakończeniu procesu i przy normalnym zamknięciu launchera.
- Biblioteka pokazuje czas każdej gry oraz sumę wszystkich sesji; sortowanie według czasu gry.
- Istniejące dane 1.0.1 i 2.0 zostają zachowane; licznik startuje od zera, bo wcześniejszy czas nie był rejestrowany.
- **Ograniczenia:** licznik nie śledzi gier WWW, uruchomień poza NOVA, ani gier, których launcher EXE uruchamia inny proces i natychmiast się zamyka. Zamknięcie NOVA kończy mierzenie, nawet jeśli gra nadal działa. Awaria lub wymuszone zamknięcie launchera może spowodować utratę najwyżej ostatnich sekund.
