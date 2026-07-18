# Brostrict

Chrome Extension (Manifest V3) for blocking sites via declarativeNetRequest.

## Stack
- **Runtime**: Bun (build script uses Bun APIs: `BunFile`, `Bun.write`, `Bun.randomUUIDv7`)
- **Language**: TypeScript (`strict: true`, `moduleResolution: bundler`)
- **Bundler**: esbuild (iife format, es6 target)
- **Types**: `chrome-types` for extension APIs

## Build
```bash
bun run build   # runs: bun build.ts
```

`build.ts` compiles `src/popup.ts` and `src/background.ts` via esbuild to `tmp/`, then copies both compiled files and static assets (`index.html`, `blocked.html`, `manifest.json`, `icon-16/32/48/128.png`, `icon-store.png`) to `build/`. The `tmp/` directory is intermediate; final output is in `build/`.

## Branding
- Theme: "Man Putting Hand On Shoulder" meme redrawn in retro 70s anime style (Akakichi no Eleven aesthetic) — a smug anime guy stops you with a hand on your shoulder. Palette: blood red `#e6301e` + ink `#141210` on cream paper `#f6efe2`, halftone dot textures, concentration/speed lines, hard offset shadows, chunky ink borders
- `logo.svg` (root) is the master mascot source: an original two-character meme scene (smug guy with hand on wide-eyed kid's shoulder, inside a manga-panel tile); the PNG icons are rasterized from it (via headless Chromium, e.g. Playwright screenshot at each size)
- The mascot SVG is inlined in `index.html` (popup header) and `blocked.html` (tile-less hero emblem with "Go touch grass, lil bro." speech bubble, plus a simplified footer version)
- Design tokens (colors, radii, shadows) are defined as CSS custom properties in `:root` of each HTML file; fonts: Bangers (display), Space Grotesk (UI), IBM Plex Mono (URLs)
- Gen Z meme wording: popup cards are titled "Bro Is Watching" (protection toggle), "Nah, Lil Bro" (blacklist), "It Gets a Pass" (whitelist) with "Ban"/"Pass" add buttons; `blocked.html` headline is "Bro-tervention." with "Bet, Watch Me" (proceed) / "Say Less" (go back) buttons; shared tagline is "your personal nah machine" (popup subtitle + blocked footer)
- Card title glyphs are pure CSS shapes: eye (protection), no-entry circle (blacklist), check (whitelist)
- Popup (`index.html`) decorative system: per-card tilt via `--tilt` CSS var; corner attitude tags (`BRO CAM` yellow / `NAH ZONE` red / `HALL PASS` green) via `.card::before`; `PANEL nn` manga indices via CSS `counter()` on `.card::after`; rotated dashed "100% NAH" stamp via `.header::after`; blinking watch-dot on the active toggle; red/green accent bars on list rows (`#blacklist`/`#whitelist .list-item::before`); caution-tape marquee strip (`.tape-strip`) below `#app`; faint diagonal speed-line texture layered over the halftone dots
- Blocked page (`blocked.html`) decorative system: fixed caution-tape marquee strips (`.tape.top` / `.tape.bottom`, "NAH — BROSTRICT — GO TOUCH GRASS — BRO IS WATCHING —"); giant outlined "NAH." watermark (`.watermark`, `-webkit-text-stroke`, z-index below `.container`); jagged yellow/ink starburst behind the emblem (`.emblem::before`/`.emblem::after` clip-path polygon); red swipe underline via `h1::after`; "CERTIFIED PASS" stamp on the whitelist notice (`.notice::after`); per-button tilt via `--tilt`; pop-in speech bubble
- All new animations (tape marquee, watch-dot blink, bubble pop) are disabled under `prefers-reduced-motion: reduce`; decorative-only elements carry `aria-hidden="true"`
- `popup.ts` adds card modifier classes for styling hooks: `protection-card`, `blacklist-card`, `whitelist-card`

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

## Tests
- Unit: `bun run test` (bun test with `tests/preload.ts`, specs in `tests/unit/`)
- E2E: `bun run test:e2e` (Playwright, specs in `tests/e2e/` — popup specs mock `chrome.storage.local` via `addInitScript`; blocked page specs mock `document.referrer` + `chrome.runtime.sendMessage`)
- No lint configured
