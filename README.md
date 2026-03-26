# Flapify

Turn any screen into a premium split-flap display. Free. No hardware needed.

Flapify is a Vite + React + TypeScript web app that recreates the feel of a mechanical airport flapboard on any TV, monitor, tablet, or wall-mounted display. It is designed to work out of the box with zero backend and zero required API keys.

Site: [flapify.app](https://flapify.app)

## Features

- Full-screen split-flap board with mechanical-style character flipping
- Quotes, clock, weather, crypto, and custom message scenes
- Zero-config weather and crypto feeds
- First-run onboarding for location and scene setup
- Kiosk mode, fullscreen mode, wake lock support, and idle UI hiding
- Installable PWA with offline-friendly shell caching
- Pure static frontend with local storage persistence

## Stack

- React 19
- TypeScript
- Vite
- Vitest
- `vite-plugin-pwa`

## Getting Started

### Requirements

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open the local URL shown by Vite in your browser.

### Production build

```bash
npm run build
npm run preview
```

## Zero-Config Experience

Flapify is set up so a new user can open the app and use it immediately:

- Weather uses Open-Meteo
- Crypto uses CoinGecko
- No backend is required
- No login is required
- No API key fields are shown in the UI

## Deploy

Flapify is ready for static hosting.

Typical settings:

- Build command: `npm install && npm run build`
- Output directory: `dist`

Works well on:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

## Project Structure

```text
src/
  app/                App shell
  audio/              Mechanical audio engine
  components/         Board, drawer, onboarding, runtime UI
  data/               Weather and crypto feed adapters
  hooks/              Runtime hooks such as wake lock and keyboard shortcuts
  lib/                Board formatting, scenes, browser helpers
  state/              Local storage persistence
public/               Manifest and static assets
```

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm test` — run the test suite

## License

MIT. See [LICENSE](./LICENSE).
