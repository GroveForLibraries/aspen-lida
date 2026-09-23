# Design system

This app's theming lives in `src/themes/`, split across three files:

- **`tokens.js`** — the static token tree (`TOKENS`): color primitives, semantic
  neutrals, and per-component overrides.
- **`theme.js`** — the `useTheme()`/`useThemeForDisplay()` hooks that resolve
  `TOKENS` plus the current library's live brand colors into what components
  actually consume, and the theme fetch/persist logic.
- **`ThemeSwitcher.js`** — `UseColorMode` and `ThemeSwitcher`, the two UI
  components that let a user toggle light/dark mode or pick between a
  library's configured Aspen LiDA themes.

## 1. Overview

Colors are organized in four layers:

```
TOKENS.primitives        -- raw values: fonts, spacing, radii, shadows, a few flat color singletons
TOKENS.semanticTokens    -- { light: {...}, dark: {...} } named neutrals (canvas, surface, textMain, ...)
TOKENS.componentTokens   -- per-component overrides (tabNavigator, input), each { light, dark }
dynamicBrandPalette      -- live primary/secondary/tertiary palette for the current library, NOT in TOKENS
```

`dynamicBrandPalette` isn't part of the static `TOKENS` constant because it
changes per library/location and is fetched at runtime (Aspen Discovery's
Aspen LiDA theme catalog). It's assembled fresh on every render inside
`useThemeForDisplay()` instead, alongside the rest of the tree, so
`useTheme().tokens` always reflects the current brand colors.

The split exists because these are genuinely different kinds of color:
**semantic tokens** are fixed neutrals that look the same in every library
(what a card background or muted caption looks like), while the
**brand palette** is *the whole reason this is a white-label app* — every
library gets its own primary/secondary/tertiary colors, and nothing else
should vary by library.

## 2. Consuming tokens

Call `useTheme()` (or `useThemeForDisplay()` if you don't need the mutation
helpers) from any component:

```js
import { useTheme } from '@/src/themes/theme';

const { brand, neutralPairs, neutrals, tokens, colorMode } = useTheme();
```

| Field | Shape | When to use it |
|---|---|---|
| `neutrals` | flat object, already resolved for the current `colorMode` | **Default choice for almost everything.** `neutrals.canvas`, `neutrals.textMuted`, etc. |
| `neutralPairs` | `{ light, dark }` per key | Only when you need both values in the same render (e.g. picking one based on some condition other than `colorMode`, or feeding a component that wants the raw pair). |
| `brand` | `{ primary, secondary, tertiary }`, each a full color scale (`50`–`900`, `base`, `baseContrast`, `500-text`, `raw`) | Any brand-colored UI: primary buttons, active states, links, focus rings. `brand.primary[500]` is the single most common lookup. |
| `tokens` | `{ primitives, dynamicBrandPalette, semanticTokens, componentTokens }` | The full raw tree, for code that wants to reach into `componentTokens` or `primitives` directly instead of through the flattened fields above. |
| `colorMode` | `'light' \| 'dark'` | Branching logic that isn't just a color lookup. |

## 3. Color usage guide

### Backgrounds

| Token | Use for |
|---|---|
| `canvas` | The base background of an entire screen. |
| `surface` | Cards, modals, menus/dropdowns, appbars — any raised panel. |
| `surfaceMuted` | List rows, table headers, a nested "well" inside a surface. |

### Text

| Token | Use for |
|---|---|
| `textMain` | Headings, primary/bold labels. |
| `textSecondary` | Normal body paragraphs. |
| `textMuted` | Placeholders, captions, helper text. |

### Icons & disclosure indicators

| Token | Use for |
|---|---|
| `icon` | General content icons (a camera, a location pin, a person icon). |
| `iconMuted` | A de-emphasized variant of the above. |
| `subtleIndicator` | Decorative carrots, unselected dropdown carets, form hints. |
| `actionableIndicator` | List-item navigation chevrons, expand/collapse toggles — anything tappable. |
| `disabledIndicator` | A carrot/arrow on a disabled control. |

### Structure & singletons

| Token | Use for |
|---|---|
| `border` | Dividers and borders. |
| `white` / `black` | True black/white, independent of light/dark mode. |
| `lightText` / `darkText` | Text meant to sit on a color chosen independently of the current `colorMode` (e.g. always-white text on a colored badge). |
| `danger` | Fixed error/destructive red, used the same in both modes. |

## 4. Component tokens

`TOKENS.componentTokens` holds a couple of components whose chrome doesn't
fit the general semantic palette:

- **`tabNavigator`** — `background`, `borderTop`, `inactiveTint` for the
  bottom tab bar.
- **`input`** — `bg`, `text`, `placeholder`, `borderDefault`, `borderInvalid`,
  `bgDisabled` for text inputs/textareas.

Both intentionally omit an "active"/"focus" color: the active tab tint and a
focused input's border always resolve to `brand.primary[500]` live, rather
than a fixed token, since those states are meant to always read as "the
library's brand color."

## 5. Primitives

`TOKENS.primitives` (`fontFamilies`, `fontWeights`, `lineHeights`, `spacing`,
`radii`, `shadows`) establishes a token schema for typography, spacing,
corner radius, and shadow — but **no component currently consumes these**.
Every existing component still sets these values ad hoc (literal pixel
numbers in `style`). Wiring components onto these primitives is a real,
separate follow-up, not something already done.

## 6. Component catalog

Each of these wraps a `components/ui/*` gluestack primitive with theme-aware
defaults. See the component's own file for full prop docs.

| Component | File | Wraps |
|---|---|---|
| `ThemedButton`, `ThemedButtonText`, `ThemedButtonIcon`, `ThemedButtonSpinner`, `ThemedButtonGroup` | `ThemedButton.js` | `Button` |
| `ThemedCheckbox` family | `ThemedCheckbox.js` | `Checkbox` |
| `ThemedInput`, `ThemedInputField`, `ThemedFormControl`, `ThemedFormControlLabelText`, `ThemedCloseIcon`, `PasswordVisibilityToggle` | `ThemedFormControls.js` | `Input`, `FormControl` |
| `ThemedTextarea`, `ThemedTextareaInput` | `ThemedTextarea.js` | `Textarea` |
| `ThemedSelect` family | `ThemedSelect.js` | `Select` |
| `ThemedRadio` family | `ThemedRadio.js` | `Radio` |
| `ThemedSwitch` | `ThemedSwitch.js` | `Switch` |
| `ThemedModal` family | `ThemedModal.js` | `Modal` |
| `ThemedActionsheet` family | `ThemedActionsheet.js` | `Actionsheet` |
| `ThemedAlert` family | `ThemedAlert.js` | `Alert` |
| `ThemedToast` family | `ThemedToast.js` | `Toast` |
| `ThemedBadge`, `ThemedBadgeText` | `ThemedBadge.js` | `Badge` |
| `ThemedText` | `ThemedText.js` | `Text` |
| `ThemedHeading` | `ThemedHeading.js` | `Heading` |
| `ThemedScrollView` | `ThemedScrollView.js` | `ScrollView` |
| `ThemedMaterialIcons`, `ThemedMaterialCommunityIcons` | `ThemedMaterialIcons.js` | `@expo/vector-icons` |
| `resolveAlertColors`, `ALERT_STATUS_COLORS` | `statusStyles.js` | (shared color logic for `ThemedAlert`/`ThemedToast`) |

`UseColorMode` and `ThemeSwitcher` (`src/themes/ThemeSwitcher.js`) aren't
`Themed*` wrappers — they're the actual light/dark and theme-picker UI,
documented in their own file.
