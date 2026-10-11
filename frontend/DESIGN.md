# MNK Chat — "Analog Console" Design System

MNK Chat is designed to feel like a **piece of hardware**: a portable
transceiver / synth with a ceramic (light) or graphite (dark) body,
tactile keys, recessed wells, an amber LCD and status LEDs. It deliberately
avoids the generic "AI SaaS" look.

> **Never use:** glassmorphism / `backdrop-blur` cards, gradient blobs or glows,
> `bg-gradient-to-*` on buttons/bubbles, purple/indigo/cyan accents, `Sparkles`
> icons, emoji decoration, "✨ magic" copy, giant rounded-3xl cards with soft
> shadows. If it looks like a landing page template, it's wrong.

---

## 1. Materials (surfaces)

| Token / class | Role | Notes |
| --- | --- | --- |
| `bg-background` / `bg-chassis` | Device body | The outermost surface. Rail and mobile dock sit **directly** on it. |
| `.panel` (`bg-card shadow-panel rounded-xl`) | Modules bolted onto the body | Sidebar, main stage, cards, dialogs. Hairline edge comes from the shadow — **don't add `border`**. |
| `.well` (`bg-well shadow-well rounded-lg`) | Recessed area | Inputs, search, segmented-control tracks, code/readout areas, "pressed / selected" list rows. |
| `.lcd` | LCD screen | Dark glass with amber mono text + scanlines. For realtime status, clocks, counts, connection info. Use sparingly — 1 per view is ideal. |
| `.grille` / `.grille-fine` | Speaker perforation | Decorative fill for empty states, headers, hero art. Low contrast. |
| `.ticks` | Ruler marks | Thin decorative dividers next to engraved labels. |
| `.screw` | Screw head | Optional corner detail on large hero panels. Max 4 per panel. |

Inner dividers inside a panel: `border-b border-border` (hairline). Never double borders.

## 2. Colour

Only two chromatic colours exist. Everything else is ink/paper neutrals.

| Purpose | Tailwind | Use for |
| --- | --- | --- |
| **Signal** (orange) | `primary`, `signal`, `.key-signal`, `.led-signal` | Primary action, active nav, unread counts, focus ring, selection, the one thing you want tapped. |
| **Live** (green) | `live`, `.led-live` | Voice/huddle, online presence, speaking, "connected". Nothing else. |
| Destructive | `destructive`, `.led-danger` | Delete, leave call, errors, muted mic state. |
| Ink | `foreground`, `.key-ink` | Text; **sent message bubbles** (`bg-foreground text-background`); strong secondary buttons. |
| Neutrals | `muted`, `muted-foreground`, `border`, `secondary`, `accent` | Everything else. |

Text on orange is **ink** (`text-primary-foreground`), not white.
Do not use raw Tailwind palette colours (`emerald-500`, `indigo-600`, `amber-…`, `cyan-…`) — map them:
`emerald → live`, `indigo/violet/primary-gradients → primary or foreground`, `amber warnings → primary`, `red → destructive`.

## 3. Typography

| Font | Class | Use |
| --- | --- | --- |
| **Archivo** (variable width) | `font-sans` (default) | All UI text. |
| Archivo Expanded | `.display-wide` | Page titles, hero headings, big names. Pair with tight leading (`leading-[1.02]`). |
| **JetBrains Mono** | `font-mono`, `.label-engraved` | Silkscreened labels (UPPERCASE, `tracking-[0.14em]`, 10px), timestamps, counts, IDs, metadata, tooltips, keyboard hints. |
| **Doto** (dot-matrix) | `.lcd-dot` / `font-dot` | Numerals on LCDs only (clock, counters, timers). Never body text. |

Rules:
- Section headers inside panels are **engraved labels** (`<SectionLabel>` or `.label-engraved`), not bold sentence-case headings.
- Use mono + `tabular` for every number that updates (counts, timers, times).
- Body text 13–15px. Titles `display-wide` 28–44px. Don't use `text-primary` on large headings — keep headings ink; orange is for small accents (a slash, a § code, a dot).

## 4. Controls

- **Buttons** (`@/components/ui/button`) are tactile keys, `rounded-full`, depress 1px on press.
  - `default` → orange signal key (1 per view).
  - `ink` → black/bone key, strong secondary.
  - `outline`/`secondary` → ceramic key.
  - `ghost` → flat until hover; for toolbars.
  - sizes: `sm`, `default`, `lg`, `icon`, `icon-sm`.
- **Icon keys in toolbars**: `size="icon-sm" variant="ghost"` or ceramic `variant="outline"`. Rounded-full or `rounded-[10px]` square keys — be consistent within a toolbar.
- **Inputs** are wells (`<Input>` already styled). Textareas: `bg-well shadow-well rounded-lg`.
- **Segmented controls / tabs**: track is a `.well rounded-full p-1`, active segment is `bg-card shadow-key`. `<Tabs>` already does this.
- **Switches** (`<Switch>`) are already a recessed track + ceramic thumb.
- **Selected list row** = pressed in: `bg-well shadow-well` + a 3px orange bar on the left (`before:` or absolute span).
- **Badges**: mono, uppercase, rounded-full, small (`<Badge>`). Unread counts: `bg-primary text-primary-foreground font-mono text-[10px] tabular rounded-full px-1.5 min-w-[18px] h-[18px]`.
- **Status**: use `<Led tone="live|signal|danger" blink|breathe />` instead of coloured dots / `animate-ping`.
- **Avatars**: circles. Online = small `led-live` dot bottom-right with a `ring-2 ring-card`. Group channels use `<PresetKey name=… />` (square key with initials) instead of a `#` icon.

## 5. Shared components (`@/components/console`)

```tsx
import { Led, Lcd, LcdClock, SectionLabel, PresetKey, Kbd, LevelMeter, channelNo } from '@/components/console';
import { BrandMark } from '@/components/console/BrandMark';
import { PageFrame, Module } from '@/components/console/PageFrame';
```

- `PageFrame` — wrapper for every non-chat page: `code="03" section="Notifications" title=… description=… actions=…`. Handles scroll, max width, header ruler, and bottom padding for the mobile dock (`--dock-h`).
- `Module` — a labelled panel inside a PageFrame (`label="ACCOUNT" title="Profile" action={…}`).
- `channelNo(id)` → `"07"`; show as `CH·07` in mono where a room ID is useful.

Page codes: `01` Chat · `02` New channel · `03` Notifications · `04` Profile · `05` Settings.

## 6. Layout & responsiveness

App shell (owned by `layouts/AppShell.tsx`):

```
≥ md (768px):  [ rail 76px on chassis ] [ sidebar panel 288–340px ] [ main panel flex-1 ]   (p-2 gaps show chassis)
< md:          full-bleed single view + bottom dock (hidden inside an open chat)
```

- The CSS variable `--dock-h` is set on the shell root: `4rem` when the mobile dock is visible, otherwise `0px`. Anything fixed to the bottom on mobile must sit above it: `bottom-[calc(var(--dock-h)+0.75rem+env(safe-area-inset-bottom,0px))]`.
- Main content lives inside a rounded panel on desktop; on mobile it's edge-to-edge (`rounded-none`, no shadow).
- Touch targets ≥ 40px on mobile. Respect `env(safe-area-inset-*)`.
- Test at 360, 390, 768, 1024, 1440, 1920 widths. No horizontal scroll ever.
- Hover-only affordances must have a touch alternative (long-press drawer, visible button).

## 7. Motion

- Short and mechanical: 100–200ms, `ease-out`. Keys travel `translate-y-px`.
- `animate-rise-in` for list items / panels appearing.
- LEDs: `animate-led-blink` (on-air, recording) or `animate-led-breathe` (idle live).
- No floating blobs, no infinite decorative motion except LEDs, level meters and the LCD.
- `prefers-reduced-motion` is globally respected.

## 8. Voice & copy

Short, plain, slightly technical, like hardware silkscreen. Examples:
`ON AIR`, `RX`, `LINK OK`, `NO SIGNAL`, `CH·07`, `3 ONLINE`, "Pick a channel", "Start a channel".
Avoid marketing fluff ("Executive", "Premium", "Experience the magic").
