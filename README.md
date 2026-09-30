# NutriDoc

NutriDoc is a mobile-first health-awareness PWA for two focused actions: scan packaged food for a personalised everyday score, or simplify a medical report/prescription into clear language.

## Included in this build

- Calm liquid-glass consumer health UI with responsive mobile bottom navigation and desktop header.
- First-time setup for age, language, and health conditions.
- Food scan flow with camera permission support, demo mode, front/ingredients scan states, analysis reveal, deterministic demo score rules, and better swaps.
- Report/prescription demo flow with upload and camera affordances.
- Local scan history and profile storage.
- PWA-ready manifest and existing server structure retained.
- Safety copy on food and report surfaces.

## Run

```bash
npm install
npm run dev
```

Camera access requires HTTPS or localhost. Demo mode is available from the home screen and scanner so the hackathon flow works without a camera.

## Production integration notes

- Keep `GROK_API_KEY` server-side and call it only from the existing API route.
- Replace demo OCR with ML Kit, Google Vision, Tesseract, or another provider behind a server route.
- Add ZXing to the scanner for barcode capture.
- Persist authenticated history in the existing Firebase layer when sign-in is enabled.
