# Cloudtop Run

Ein mobile-first Three.js/Vite-Platformer mit hochwertigem Hauptmenü, zwei spielbaren Leveln, Levelauswahl und lokal gespeichertem Fortschritt.

## Inhalte

- **Level 1 – Cloudtop Run:** Gartenroute, Sprungbrett-Felsen, Sägen, animierte Stachelfallen, Bonusroute, bewegliche Plattform und Burgfinale.
- **Level 2 – Sunset Spires:** schnellerer Sunset-Kurs mit eigener Route, engeren Übergängen, neuen Bonusfelsen und Summit-Finale.
- Drei Akte pro Level, 20 Coins, drei Checkpoints, Respawn-Inszenierung und Ergebniswertung.
- 120-Hz-Fixed-Step-Controller mit Coyote Time, Jump Buffer, variabler Sprunghöhe, Air Control und Dash.
- Fortschritt, Bestzeit, Coin-Bestwert, wenigste Stürze und Sterne werden lokal im Browser gespeichert.
- Arcade-Sounds für Sprung, Landung, Dash, Sprungbrett, Coins, Checkpoints, Treffer und Levelabschluss.

## Lokal starten

```bash
npm install
npm run dev
npm run build
```

Das Hauptmenü liegt auf `/`. Direkte Entwicklungslinks sind `/?level=cloudtop-run` und `/?level=sunset-spires`.

Am Desktop: **WASD/Pfeiltasten**, **Leertaste** zum Springen, **Shift/E** für Dash. Auf Mobilgeräten: virtueller Joystick links, Jump/Dash rechts.

## GitHub Pages

Pushes auf `master` bauen das Spiel über `.github/workflows/deploy-pages.yml` und veröffentlichen den Inhalt aus `dist/`. Vite verwendet relative Asset-Pfade, damit Modelle und Sounds auch unter dem Repository-Unterpfad korrekt geladen werden.

## Mastery

Jedes Level vergibt einen Stern für den Abschluss. Ein zweiter Stern erfordert mindestens 18 Coins. Der dritte Stern kombiniert die Zielzeit des Levels mit höchstens zwei Stürzen.

## Technik und Assets

Die Level sind datengetrieben in `src/game/LevelData.ts` definiert. `LevelValidator.ts` prüft kritische Sprungabstände, Stufenhöhen, Checkpoint-Unterstützung und Coin-Mastery. Das Hauptmenü lädt die Three.js-Spielengine erst beim Start eines Levels.

Die Szene nutzt ausgewählte glTF-Modelle aus dem **Ultimate Platformer Pack by Quaternius**. Das Pack steht unter CC0 1.0; eine Lizenzkopie liegt unter `public/game-assets/LICENSE.txt`.

Die verwendeten Effekte stammen aus dem vom Projektinhaber bereitgestellten Paket **Arcade Sound FX**. Im Repository liegen nur die tatsächlich im Spiel verwendeten WAV-Dateien.
