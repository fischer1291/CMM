# Logo, App-Icon und Splash

`logo.js` beschreibt das Logo als SVG: Neon-Verlaufsring, Hörer mit
Signalbögen und der pinke „erreichbar“-Punkt. Der Hörer stammt aus Material
Icons (Apache-2.0-Lizenz). In der App zeichnet `ui/components/LogoMark.tsx`
dieselbe Geometrie, damit der animierte Startbildschirm nahtlos an den
nativen Splash anschließt.

Neu erzeugen (schreibt alle Icon- und Splash-PNGs ins Projekt):

```bash
cd docs/brand && npm install --no-save @resvg/resvg-js@2 && node export.js
```

Das App-Store-Icon wird als RGB-PNG ohne Alpha-Kanal geschrieben
(`rgbpng.js`), weil App Store Connect Icons mit Alpha-Kanal ablehnt.
Geänderte native Assets (App-Icon, Splash-Logo) sind erst nach einem neuen
nativen Build sichtbar.
