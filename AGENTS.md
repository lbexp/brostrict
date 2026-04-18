# Brostrict

Chrome Extension (Manifest V3) for blocking sites via declarativeNetRequest.

## Stack
- **Runtime**: Bun (build script uses Bun APIs: `BunFile`, `Bun.write`, `Bun.randomUUIDv7`)
- **Language**: TypeScript (`strict: true`, `moduleResolution: bundler`)
- **Effect library**: `effect` for functional error handling
- **Bundler**: esbuild (iife format, es6 target)
- **Types**: `chrome-types` for extension APIs

## Build
```bash
bun run build   # runs: bun build.js
```

`build.ts` compiles `src/popup.ts` and `src/background.ts` to `tmp/`, copies static assets (`index.html`, `blocked.html`, `icon.png`, `manifest.json`) to `build/`.

Build output is NOT committed (see `.gitignore`: `build/`, `tmp/`).

## Entry Points
- `src/popup.ts` → popup UI (runs in extension popup)
- `src/background.ts` → service worker (handles blocking rules, whitelist matching)
- `blocked.html` → redirect target for blocked sites

## Runtime Constraints
- `background.ts` uses `chrome.runtime.onInstalled` / `onStartup` for init
- Data stored in `chrome.storage.local` under key `brostrict_data`
- `noUncheckedIndexedAccess: true` enabled (treats array index access as potentially undefined)

## No tests or lint configured
