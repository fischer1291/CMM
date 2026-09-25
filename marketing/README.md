# Marketing

Landing Page und Werbemittel für Call Me Maybe. Strategie, Texte und Launchplan:
[PLAYBOOK.md](PLAYBOOK.md).

```bash
cd marketing
npm install
npm run build          # SITE_URL=… DOWNLOAD_URL=… npm run build
```

Das Build braucht Google Chrome (`CHROME=/pfad/zu/chrome` zum Überschreiben) und
Internet für die Google Fonts.

| Pfad | Inhalt |
|---|---|
| `src/brand.css` | Farben und Schrift aus `ui/theme.ts`, Handy-Mockup |
| `src/screens.js` | App-Screens als HTML (Status, Moment, Kreis, Moments, Statistik, Anruf) |
| `src/landing.js` | Landing Page |
| `src/kit.js` | Social-Media-, App-Store- und Druckmotive |
| `dist/landing/` | Fertige Landing Page, deploybar als eigene Netlify-Site |
| `dist/kit/` | Gerenderte PNGs und der Flyer als PDF |

## Landing Page deployen

1. In Netlify eine neue Site anlegen und `dist/landing/` hochladen (Drag & Drop
   unter „Deploy manually“) oder `npx netlify deploy --dir dist/landing --prod`.
2. Unter *Forms* die Formularerkennung aktivieren. Die Warteliste heißt `warteliste`.
3. Domain verbinden, dann `SITE_URL` setzen und neu bauen, damit Linkvorschau und
   QR-Code auf die richtige Adresse zeigen.

Sobald es einen öffentlichen TestFlight- oder App-Store-Link gibt, mit
`DOWNLOAD_URL=…` bauen: Die Buttons führen dann direkt zum Download statt zur Warteliste.
