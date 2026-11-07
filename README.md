# NOVA GAME LAUNCHER 1.0 — Windows

Pierwsza wersja aplikacji do uruchamiania **lokalnych gier EXE** i **gier WWW**.

## Co działa w 1.0
- Biblioteka gier: dodawanie EXE (przez okno wyboru) lub URL HTTP/HTTPS.
- Uruchamianie EXE w Windows i otwieranie gier online w domyślnej przeglądarce.
- Ulubione, wyszukiwanie, filtry, sortowanie i ostatnio uruchamiane.
- Liczniki gier oraz uruchomień i eksport kopii JSON.
- Automatyczny zapis w `%APPDATA%/nova-game-launcher/games.json` (lokalnie, bez konta).
- Gra jest usuwana wyłącznie z biblioteki — nie z dysku.

**Uwaga:** Launcher nie pobiera gier automatycznie, nie instaluje ich, nie wykonuje aktualizacji gier, nie ma kont ani synchronizacji w chmurze. Adresy WWW uruchamiają się w domyślnej przeglądarce.

## Uruchomienie ze źródeł na Windows
1. Zainstaluj Node.js 22 (LTS) i Git.
2. Pobierz repozytorium / rozpakuj ZIP.
3. Otwórz PowerShell w folderze, w którym znajduje się `package.json`.
4. Uruchom: `npm install`, potem `npm start`.

## Zbudowanie EXE bez Visual Studio / lokalnego kompilowania
1. Wgraj **zawartość** folderu do nowego repozytorium GitHub (zachowując `.github/workflows/build-windows.yml`).
2. Wejdź w **Actions** → **Build NOVA GAME LAUNCHER EXE** → **Run workflow**.
3. Po zielonym zakończeniu otwórz uruchomienie i pobierz archiwum **NOVA-GAME-LAUNCHER-1.0-Windows** z sekcji Artifacts.
4. Rozpakuj: zobaczysz instalator NSIS oraz wersję portable `.exe` (nazwy mogą różnić się sufiksem architektury).

Alternatywnie lokalnie: `npm install` → `npm run dist`; wyniki w folderze `dist`.

## Ważne informacje
- Budowane pliki EXE są **niepodpisane** certyfikatem wydawcy. Windows SmartScreen może wyświetlić ostrzeżenie.
- Uruchamiaj wyłącznie zaufane pliki EXE. Launcher uruchamia wskazany program z uprawnieniami użytkownika.
- Eksport JSON zawiera lokalne ścieżki i URL-e gier; nie udostępniaj go publicznie, jeśli są prywatne.
- Dla gier Cloudflare Pages używaj pełnego adresu URL (np. `https://example.pages.dev`).
- Build wymaga dostępu do Internetu, aby pobrać Electron i electron-builder.
