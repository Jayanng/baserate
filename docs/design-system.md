# BaseRate Design System & Token Specification

> **Phase:** Phase 0 — Design Tokens & Visual DNA  
> **Source of Truth:** [`design/tokens.css`](file:///home/ubuntu/baserate/design/tokens.css)  
> **Approved References:**  
> - Landing: [`design/home_v3_small.png`](file:///home/ubuntu/baserate/design/home_v3_small.png)  
> - Overview: [`design/overview_v2_small.png`](file:///home/ubuntu/baserate/design/overview_v2_small.png)  
> - Dossier: [`design/dossier_v3_small.png`](file:///home/ubuntu/baserate/design/dossier_v3_small.png)  
> - Scorecard: [`design/scorecard_v1_small.png`](file:///home/ubuntu/baserate/design/scorecard_v1_small.png)  

---

## 1. Design System Overview & Intent

BaseRate is a structured pre-trade stress-testing workbench for Bitget rTokens (tokenized US stocks traded 24/7). It is **not** a speculative crypto gambling app, a generic exchange terminal, or an automated trading bot. It is a research workbench where AI processes data, deterministic engines compute risk, and the human trader makes the final decision.

The visual system reflects this purpose through:
- **Calm, High-Conviction Research Aesthetic:** High readability, clean white (`#ffffff`) and shell (`#f8f9fc`) surfaces framed against a soft cool canvas (`#e9eaf0`).
- **Signature Violet Brand Identity:** Royal indigo/violet (`#3a1ec8`) primary accent for core interactions, key highlights, and active navigation states.
- **Strict Semantic Color Accents:** Four distinct accent families (Lime, Lavender, Peach, Coral) strictly mapped to statistical and risk meaning—never decorative.
- **Bento Grid Architecture:** Generous rounded containers (36px shell, 24px cards, 16px inner tiles) with subtle layered shadows and hairline borders.
- **Dual-Font Typographic Hierarchy:** Plus Jakarta Sans for confident structural UI headers and Inter with tabular figures (`tabular-nums`) for quantitative data integrity.

---

## 2. Complete Token Taxonomy & Reference

All tokens are defined as CSS Custom Properties in [`design/tokens.css`](file:///home/ubuntu/baserate/design/tokens.css).

### 2.1 Surfaces & Canvas

| Token Name | Value | Purpose / Role |
|---|---|---|
| `--br-surface-canvas` | `#e9eaf0` | Window / browser viewport background surrounding the app frame |
| `--br-surface-shell` | `#f8f9fc` | Default container background, bento card background |
| `--br-surface-paper` | `#ffffff` | Application frame background, white card surfaces |
| `--br-surface-card` | `#f8f9fc` | Standard card surface inside frame |
| `--br-surface-card-white` | `#ffffff` | Elevated white card surface with subtle shadow |
| `--br-surface-well` | `#efeff5` | Progress track backgrounds, slider track, recessed wells |
| `--br-surface-subtle` | `#f0f1f5` | Neutral read-only chips, secondary badges |
| `--br-surface-dark` | `#17182d` | High-contrast footer bar, Monday grade peek badge |

Aliases: `--canvas`, `--shell`, `--paper`, `--card`.

### 2.2 Borders & Lines

| Token Name | Value | Purpose / Role |
|---|---|---|
| `--br-border-hairline` | `rgba(23, 24, 45, 0.04)` | Ultra-subtle bento card boundaries |
| `--br-border-subtle` | `rgba(23, 24, 45, 0.06)` | Nav bar bottom border, list item dividers |
| `--br-border-medium` | `rgba(23, 24, 45, 0.08)` | Input borders, search bar borders, secondary buttons |
| `--br-border-strong` | `rgba(23, 24, 45, 0.12)` | Dashed future calendar borders, prominent separators |
| `--br-border-focus` | `rgba(58, 30, 200, 0.35)` | Interactive input focus states |

Aliases: `--br-line`, `--line`.

### 2.3 Typography & Text Colors

| Token Name | Value | Purpose / Role |
|---|---|---|
| `--br-text-ink` | `#17182d` | Primary headline and quantitative data text |
| `--br-text-muted` | `#77798b` | Body copy, secondary captions, metadata labels |
| `--br-text-faint` | `#999bab` | Tertiary text, keyboard shortcuts (`⌘K`), subtle timestamps |
| `--br-text-placeholder` | `#b0b3c1` | Input placeholder text |
| `--br-text-inverse` | `#ffffff` | Inverted white text on dark or primary surfaces |
| `--br-text-inverse-muted` | `#b8bac8` | Inverted subtext on dark footer |

Aliases: `--ink`, `--muted`, `--faint`.

### 2.4 Primary Accent: Indigo / Violet

| Token Name | Value | Purpose / Role |
|---|---|---|
| `--br-primary` | `#3a1ec8` | Signature BaseRate violet: buttons, active tabs, brand mark |
| `--br-primary-hover` | `#28138d` | Darkened violet for hover and active button states |
| `--br-primary-deep` | `#2c169c` | High-contrast violet for sub-elements |
| `--br-primary-soft` | `#ece9ff` | Lavender tint for active chips, icon backgrounds, avatar |
| `--br-primary-subtle` | `rgba(58, 30, 200, 0.08)` | Focus ring wash, selection background |
| `--br-primary-border` | `rgba(58, 30, 200, 0.20)` | Ghost button borders, outline states |

Aliases: `--indigo`, `--violet`, `--violet-dark`, `--lav-soft`.

### 2.5 Semantic Accents & Rules

The four semantic colors must strictly represent domain data states:

#### Lime — Positive / Observed / Inside Band / Desk Live / Up
- `--br-lime`: `#d9f884` (Vibrant fill for distribution bars, live desk pill, badge dots)
- `--br-lime-soft`: `#edfbd2` (Soft background for confirmation banners, observed tag, hit badge)
- `--br-lime-ink`: `#3f5b00` (High-contrast green text/stroke on lime backgrounds)
- `--br-lime-border`: `rgba(63, 91, 0, 0.12)` (Border for lime banners)
- *Usage:* Historical outcomes that closed up, forecast landing inside predicted band, observed Bitget data tag, desk live indicator.

#### Lavender — Neutral / Regime / Category / Chips
- `--br-lavender`: `#ddd8fb` (Mid-tone lavender for chop regime dots and distribution bars)
- `--br-lavender-soft`: `#ece9ff` (Background for trade chips, regime tags, avatar)
- `--br-lavender-subtle`: `#f4f2fe` (Subtle hover state for nav links)
- `--br-lavender-ink`: `#3a1ec8` (Violet text on lavender tags)
- *Usage:* Trade parameter chips (rNVDA, Long, 3x), chop/trend-up regime tags, action icons.

#### Peach — Pending / Warning / Replay / Estimated
- `--br-peach`: `#ffe2d7` (Warm fill for replay mode pill, estimated data tag, pending states)
- `--br-peach-soft`: `#fff1eb` (Subtle warm background for adjustment icons)
- `--br-peach-ink`: `#a9462b` (Deep terracotta text on peach surfaces)
- `--br-peach-border`: `rgba(169, 70, 43, 0.12)` (Border for estimated tags and replay badges)
- *Usage:* Replay mode indicators, estimated Bitget funding carry tags, pending Monday grades, band adjustment callouts.

#### Coral — Risk / Miss / Liquidation Line / Down / Severe Gap
- `--br-coral`: `#ffb4a2` (Mid coral for distribution bars, trend-down regime dots)
- `--br-coral-bright`: `#e8603c` (High-urgency coral for liquidation line percentage, miss dots, squeeze regime)
- `--br-coral-soft`: `#fecdd3` (Soft rose-coral for capitulation regime bars and bad accuracy pills)
- `--br-coral-ink`: `#991b1b` (High-contrast deep red for severe warnings)
- `--br-coral-deep`: `#c0392b` (Alternative deep red for negative funding or gaps)
- *Usage:* Liquidation distance display (`-11.8%`), historical gap through liquidation line, forecast misses, capitulation/squeeze regimes.

### 2.6 Radii Hierarchy

| Token Name | Value | Purpose / Role |
|---|---|---|
| `--br-radius-shell` | `36px` | Main application frame (`.frame`) |
| `--br-radius-card` | `24px` | Bento cards, trade intake container, main sections |
| `--br-radius-inner` | `16px` | Risk metric tiles, text input boxes, counterfactual result cards, calendar day tiles |
| `--br-radius-compact` | `12px` | Action icon boxes, brand mark container |
| `--br-radius-sm` | `8px` | Distribution bar tracks, status tags, slider handles |
| `--br-radius-xs` | `4px` | Small indicator dots, mini accuracy bar corners |
| `--br-radius-pill` | `9999px` | Buttons, navigation links, status pills, chips, search bar |
| `--br-radius-round` | `50%` | Avatar circle, live indicator dots |

### 2.7 Layered Elevation & Shadows

| Token Name | Value | Purpose / Role |
|---|---|---|
| `--br-shadow-shell` | `0 28px 70px -22px rgba(23,24,45,.12), 0 4px 14px rgba(23,24,45,.04)` | Ambient elevation for the 1420px app frame |
| `--br-shadow-card` | `0 10px 30px -8px rgba(23,24,45,.05), 0 2px 6px rgba(23,24,45,.03)` | Standard bento card elevation |
| `--br-shadow-card-subtle` | `0 4px 16px rgba(23,24,45,.03)` | Light depth for elevated white cards |
| `--br-shadow-float` | `0 20px 48px -18px rgba(23,24,45,.18)` | Floating preview cards on landing hero |
| `--br-shadow-primary` | `0 12px 24px -12px rgba(58,30,200,.65)` | Primary call-to-action button glow |
| `--br-shadow-primary-sm` | `0 8px 18px -6px rgba(58,30,200,.45)` | Active navigation pill or day tile glow |
| `--br-shadow-thumb` | `0 2px 8px rgba(58,30,200,.30)` | Range slider thumb elevation |
| `--br-shadow-focus` | `0 0 0 3px rgba(58,30,200,.08)` | Keyboard and click focus ring |

### 2.8 Spacing Scale (4px / 8px Grid)

| Token Name | Value (px) | Typical Application |
|---|---|---|
| `--br-space-1` | 4px | Micro padding, indicator dot offsets |
| `--br-space-2` | 8px | Button inline gaps, pill padding vertical, chip horizontal gaps |
| `--br-space-3` | 12px | Metric tile internal padding, card item gaps |
| `--br-space-4` | 16px | Standard component padding, tile padding, button horizontal padding |
| `--br-space-5` | 20px | Section row gaps, hero proof element gaps |
| `--br-space-6` | 24px | Bento grid row/column gap, card internal padding |
| `--br-space-7` | 28px | Intake card padding, large card vertical spacing |
| `--br-space-8` | 32px | App frame outer padding, content section top/bottom padding |
| `--br-space-9` | 36px | Top nav horizontal padding, wide content padding |
| `--br-space-10` | 40px | Major block spacing |
| `--br-space-11` | 44px | Content bottom padding |
| `--br-space-12` | 48px | Nav link offset from brand mark |
| `--br-space-16` | 64px | Section padding on landing page |
| `--br-space-18` | 72px | Top navigation bar fixed height |
| `--br-space-20` | 80px | Landing page hero gap |

### 2.9 Typography System

#### Families
- `--br-font-sans`: `'Plus Jakarta Sans', Jakarta, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- `--br-font-mono`: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace` (Must be paired with `font-variant-numeric: tabular-nums`)

#### Weights
- `--br-font-weight-regular`: `400`
- `--br-font-weight-medium`: `500`
- `--br-font-weight-semibold`: `600`
- `--br-font-weight-bold`: `700`
- `--br-font-weight-extrabold`: `800`

#### Size & Line-Height Scale
| Token | Size | Line Height | Tracking | Used For |
|---|---|---|---|---|
| `--br-font-size-2xs` | 9px | 12px | `0.06em` | Graph axis labels, micro tags |
| `--br-font-size-xs` | 10px | 14px | `0.08em - 0.1em` | Uppercase card headers, metric keys, ledger dates |
| `--br-font-size-sm` | 11px | 15px | `0.04em - 0.1em` | Chip text, kicker eyebrows, pill labels, legend text |
| `--br-font-size-base` | 12px | 16px | `0em` | Table data cells, secondary descriptions, search placeholder |
| `--br-font-size-md` | 13px | 18px | `0em` | Nav links, confirmation banners, section subtitles |
| `--br-font-size-body` | 14px | 20px | `0em` | Regular body paragraphs, step titles |
| `--br-font-size-lg` | 15px | 22px | `-0.01em` | Trade intake input, prominent subtitles |
| `--br-font-size-xl` | 16px | 24px | `-0.01em` | Brand title, avatar text |
| `--br-font-size-2xl` | 18px | 24px | `-0.02em` | Active position titles, day numbers |
| `--br-font-size-3xl` | 20px | 28px | `-0.03em` | Counterfactual value, metric readout |
| `--br-font-size-4xl` | 22px | 28px | `-0.03em` | Mini stat numbers |
| `--br-font-size-5xl` | 24px | 30px | `-0.03em` | Risk tile primary values (`-11.8%`, `-0.31%`) |
| `--br-font-size-6xl` | 26px | 32px | `-0.03em` | Main page title (`h1` on Overview, Dossier, Scorecard) |
| `--br-font-size-7xl` | 33px | 38px | `-0.04em` | Landing page section title (`h2`) |
| `--br-font-size-8xl` | 52px | 52px | `-0.04em` | Big stats (`93%` survival rate) |
| `--br-font-size-9xl` | 67px | 68px | `-0.055em` | Landing page hero headline (`h1`) |
| `--br-font-size-hero` | 72px | 72px | `-0.05em` | Scorecard calibration hero (`83%`) |

### 2.10 Transitions
- `--br-transition-fast`: `150ms cubic-bezier(0.4, 0, 0.2, 1)` (nav hover, button hover)
- `--br-transition-base`: `200ms cubic-bezier(0.4, 0, 0.2, 1)` (card elevations, modal pop)
- `--br-transition-slow`: `300ms cubic-bezier(0.4, 0, 0.2, 1)` (drawer expand, slider movement)

---

## 3. Visual Rules & Philosophy

1. **Light Canvas & Grounded Container:** All screens sit within a centered `1420px` application frame with `border-radius: var(--br-radius-shell)` (`36px`) and `box-shadow: var(--br-shadow-shell)`, over the `#e9eaf0` background.
2. **Top Navigation Bar:** Every app screen has a uniform `72px` tall top navigation bar with:
   - Brand mark (`32px` violet rounded square with white bold "B") + "BaseRate" text.
   - Three navigation links: `Overview`, `Dossier`, `Scorecard`.
   - Active state: Violet pill (`background: var(--br-primary); color: #fff; border-radius: var(--br-radius-pill);`).
   - Right side: Global search pill (`⌘K`) and user avatar ("JE").
3. **Bento Card Structure:** Content is organized in a 2-column or 3-column bento grid using `var(--br-surface-card)` (`#f8f9fc`), `24px` radius, and `1px solid var(--br-border-hairline)`.
4. **Evidence-Driven Typography:** Every quantitative number must be rendered using `Inter` with `tabular-nums` so numbers align reliably across rows and tables.
5. **Calibrated Semantic Balance:** Semantic colors (Lime, Lavender, Peach, Coral) should only appear on status pills, distribution bars, dots, and risk values. Never paint entire page backgrounds or large hero blocks in alarming neon colors.

---

## 4. Forbidden Drift (Strict Guardrails)

Future developers and agents **must not** violate these design boundaries:

- ❌ **NO Dark Hacker UI:** Do not switch to a dark mode, black terminal aesthetic, cyberpunk neon green, or midnight crypto interface. BaseRate is an authoritative, transparent light-theme research desk.
- ❌ **NO Generic Blue Crypto Exchange Palettes:** Do not introduce generic cyan, Binance yellow, Coinbase blue, or TradingView chart styling. The primary color is locked to royal violet (`#3a1ec8`).
- ❌ **NO Sidebar Navigation:** The application strictly uses a unified **top navigation bar** across all four pages. Do not introduce a left-hand collapsible rail or sidebar navigation.
- ❌ **NO Persistent Chatbot UI:** The Dossier intake is a structured single natural-language intake bar ("What are you considering?"). Do not turn it into a ChatGPT-style conversational feed or message history.
- ❌ **NO Raw Hex Values in Component Styles:** Hardcoding `#3a1ec8`, `#d9f884`, `#ffe2d7`, `#e8603c`, or raw rgba strings directly in CSS Modules or inline styles is strictly forbidden. All styles must reference `var(--br-*)` tokens.
- ❌ **NO Unlabelled Metrics / Fake Confidence Scores:** Never output BUY / SELL / LONG / SHORT trading recommendations. Every displayed metric must display its evidence status tag (`Observed`, `Estimated`, `Target`, or `Replay`).
- ❌ **NO Pill Overload:** Pills and chips are reserved for parsed trade chips, status indicators, and actionable buttons. Do not decorate every label with a pill.
- ❌ **NO Arbitrary Red Danger Overload:** Danger is not a flashing siren; it is communicated through the quantitative liquidation line and coral accents (`#e8603c`).

---

## 5. How Future Pages Must Consume Tokens

### 5.1 Global Import
In Phase 1 and beyond, `tokens.css` will be imported globally at the root layout:

```tsx
// app/layout.tsx
import '../design/tokens.css'; // or imported via app/globals.css
```

### 5.2 CSS Module Usage Pattern
Components should reference CSS custom properties directly:

```css
/* Example: components/dossier/RiskMetrics.module.css */
.card {
  background: var(--br-surface-card);
  border-radius: var(--br-radius-card);
  border: 1px solid var(--br-border-hairline);
  padding: var(--br-space-6) var(--br-space-7);
}

.title {
  font-family: var(--br-font-sans);
  font-size: var(--br-font-size-xs);
  font-weight: var(--br-font-weight-extrabold);
  letter-spacing: var(--br-letter-spacing-caps);
  text-transform: uppercase;
  color: var(--br-text-muted);
}

.riskValueCoral {
  font-family: var(--br-font-mono);
  font-size: var(--br-font-size-5xl);
  font-weight: var(--br-font-weight-extrabold);
  letter-spacing: var(--br-letter-spacing-tight);
  color: var(--br-coral-bright);
}

.tagObserved {
  background: var(--br-lime-soft);
  color: var(--br-lime-ink);
  font-size: var(--br-font-size-2xs);
  font-weight: var(--br-font-weight-bold);
  border-radius: var(--br-radius-xs);
  padding: var(--br-space-1) var(--br-space-2);
}
```

### 5.3 Local Font Management & Windows Safety
- **Approved Font Binaries:** Located at `design/fonts/PlusJakartaSans.woff2` and `design/fonts/Inter.woff2`.
- **Phase 0 Reference:** Referenced relative to `design/tokens.css` via `url('fonts/PlusJakartaSans.woff2')` and `url('fonts/Inter.woff2')`.
- **Phase 1 App Scaffolding:** When Next.js is initialized, fonts will be safely mirrored to `public/fonts/` without unnecessary multiple copies.
- **Cross-Platform Safety:**
  - All asset URLs in CSS use forward slashes (`/`).
  - Font family declarations match the exact casing of font descriptors.
  - File line endings must be LF.
  - Zero symlink dependencies to ensure flawless Windows and Linux compatibility.
