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
bun run build   # runs: bun build.ts
```

`build.ts` compiles `src/popup.ts` and `src/background.ts` via esbuild to `tmp/`, then copies both compiled files and static assets (`index.html`, `blocked.html`, `icon.png`, `manifest.json`) to `build/`. The `tmp/` directory is intermediate; final output is in `build/`.

## Entry Points
- `src/popup.ts` → popup UI (runs in extension popup)
- `src/background.ts` → service worker (handles blocking rules, whitelist matching)
- `blocked.html` → redirect target for blocked sites; includes inline JavaScript that communicates with background via `chrome.runtime.sendMessage`

## Data Structure
Stored in `chrome.storage.local` under key `brostrict_data`:
```typescript
interface Data {
  blacklist: string[];  // Sites to block (e.g., "youtube.com")
  whitelist: string[];  // Exceptions (e.g., "youtube.com/video")
  active: boolean;      // Master toggle for protection
}
```

## Message API
Communication between `blocked.html` and background script:
- `chrome.runtime.sendMessage({ type: 'getWhitelist' })` → `{ whitelist: string[] }`
- `chrome.runtime.sendMessage({ type: 'isWhitelisted', url: string })` → `{ result: boolean }`

Used by `blocked.html` to detect if the blocked URL matches a whitelist entry and show the "Proceed" button.

## Runtime Constraints
- `background.ts` uses `chrome.runtime.onInstalled` / `onStartup` for init
- `noUncheckedIndexedAccess: true` enabled (treats array index access as potentially undefined)
- Whitelist rules have priority 2, blacklist rules have priority 1 in declarativeNetRequest

## No tests or lint configured
