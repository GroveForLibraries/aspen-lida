import React from 'react';
import { Uniwind } from 'uniwind';
import { GLOBALS } from '../util/globals';
import {
     useThemeState,
     useUpdateThemeColorMode,
     useUpdateThemeColors,
     useResetThemeState,
} from '../hooks/useThemeData';
import { getThemeInfo } from '../util/api/system';
import { loadThemeCatalog } from '../util/db';
import { buildSwatchFromThemeTokens } from '../helpers/helpers';
import { TOKENS } from './tokens';

export { TOKENS };

/**
 * Builds the Uniwind CSS-variable map (`--color-primary-500`, etc.) for a brand palette, applied
 * to the app's root View style so className-based color utilities resolve to the current theme.
 * @param themeColors {{primary, secondary, tertiary}} brand palette, or a fallback if incomplete
 * @returns {Object} map of `--color-*` variable name to hex value
 */
function buildThemeVars(themeColors) {
     const palette = themeColors?.primary && themeColors?.secondary && themeColors?.tertiary
          ? themeColors
          : buildFallbackPalette();

     return {
          '--color-primary-50': palette.primary[50],
          '--color-primary-100': palette.primary[100],
          '--color-primary-200': palette.primary[200],
          '--color-primary-300': palette.primary[300],
          '--color-primary-400': palette.primary[400],
          '--color-primary-500': palette.primary[500],
          '--color-primary-600': palette.primary[600],
          '--color-primary-700': palette.primary[700],
          '--color-primary-800': palette.primary[800],
          '--color-primary-900': palette.primary[900],
          '--color-primary-500-text': palette.primary['500-text'],
          '--color-primary-base': palette.primary.base,
          '--color-primary-base-contrast': palette.primary.baseContrast,
          '--color-secondary-50': palette.secondary[50],
          '--color-secondary-100': palette.secondary[100],
          '--color-secondary-200': palette.secondary[200],
          '--color-secondary-300': palette.secondary[300],
          '--color-secondary-400': palette.secondary[400],
          '--color-secondary-500': palette.secondary[500],
          '--color-secondary-600': palette.secondary[600],
          '--color-secondary-700': palette.secondary[700],
          '--color-secondary-800': palette.secondary[800],
          '--color-secondary-900': palette.secondary[900],
          '--color-secondary-500-text': palette.secondary['500-text'],
          '--color-secondary-base': palette.secondary.base,
          '--color-secondary-base-contrast': palette.secondary.baseContrast,
          '--color-tertiary-50': palette.tertiary[50],
          '--color-tertiary-100': palette.tertiary[100],
          '--color-tertiary-200': palette.tertiary[200],
          '--color-tertiary-300': palette.tertiary[300],
          '--color-tertiary-400': palette.tertiary[400],
          '--color-tertiary-500': palette.tertiary[500],
          '--color-tertiary-600': palette.tertiary[600],
          '--color-tertiary-700': palette.tertiary[700],
          '--color-tertiary-800': palette.tertiary[800],
          '--color-tertiary-900': palette.tertiary[900],
          '--color-tertiary-500-text': palette.tertiary['500-text'],
          '--color-tertiary-base': palette.tertiary.base,
          '--color-tertiary-base-contrast': palette.tertiary.baseContrast,
     };
}

const DEFAULT_COLOR_SCALE = {
     50: '#f9fafb',
     100: '#f3f4f6',
     200: '#e5e7eb',
     300: '#d1d5db',
     400: '#9ca3af',
     500: '#6b7280',
     600: '#4b5563',
     700: '#374151',
     800: '#1f2937',
     900: '#111827',
     '500-text': '#ffffff',
     base: '#6b7280',
     baseContrast: '#ffffff',
};

/**
 * A neutral gray brand palette (primary/secondary/tertiary, all built from the same gray scale),
 * used whenever a real brand `themeColors` value isn't available yet.
 * @returns {{primary, secondary, tertiary}}
 */
function buildFallbackPalette() {
     return {
          primary: { ...DEFAULT_COLOR_SCALE },
          secondary: { ...DEFAULT_COLOR_SCALE, base: '#9ca3af', 500: '#9ca3af', '500-text': '#000000', baseContrast: '#000000' },
          tertiary: { ...DEFAULT_COLOR_SCALE, base: '#c08428', 500: '#c08428' },
     };
}

/**
 * Builds the `theme` object: the current brand palette (or its fallback) plus a snapshot of the
 * neutral color map, in the shape `updateTheme()` and other consumers expect.
 * @param themeColors {{primary, secondary, tertiary}} brand palette, or a fallback if incomplete
 * @returns {{colors, ui, tokens: {colors}}}
 */
function buildThemeRuntime(themeColors) {
     const palette = themeColors?.primary && themeColors?.secondary && themeColors?.tertiary
          ? themeColors
          : buildFallbackPalette();

     return {
          colors: palette,
          ui: buildUiColorMap(),
          // Mirrors the palette at tokens.colors for callers that read colors this way.
          tokens: {
               colors: palette,
          },
     };
}

/**
 * Builds the neutralPairs map: per-key {light, dark} color pairs from TOKENS.semanticTokens, plus
 * the mode-independent values from TOKENS.primitives.singletons.
 * @returns {Object}
 */
function buildUiColorMap() {
     return {
          ...Object.fromEntries(
               Object.keys(TOKENS.semanticTokens.light).map((key) => [
                    key,
                    { light: TOKENS.semanticTokens.light[key], dark: TOKENS.semanticTokens.dark[key] },
               ])
          ),
          ...TOKENS.primitives.singletons,
     };
}

/**
 * Resolves a neutralPairs map (each entry either a {light, dark} pair or a mode-independent flat
 * value) down to a single value per key for the given colorMode.
 * @param neutralPairs map of key -> {light, dark} pair or flat value
 * @param colorMode 'light' or 'dark'
 * @returns {Object} map of key -> resolved color value
 */
export function resolveUiColorMap(neutralPairs, colorMode) {
     return Object.fromEntries(
          Object.entries(neutralPairs).map(([key, value]) => {
               const isModePair = value && typeof value === 'object' && ('light' in value || 'dark' in value);
               return [key, isModePair ? value[colorMode === 'light' ? 'light' : 'dark'] : value];
          })
     );
}

/**
 * Builds the `brand` map: full primary/secondary/tertiary color scales (50-900, `base`,
 * `baseContrast`, `500-text`, and the original `raw` swatch) from a brand palette.
 * @param themeColors {{primary, secondary, tertiary}} brand palette, or a fallback if incomplete
 * @returns {{primary, secondary, tertiary}} each a full color scale
 */
function buildRuntimeColorMap(themeColors) {
     const palette = themeColors?.primary && themeColors?.secondary && themeColors?.tertiary
          ? themeColors
          : buildFallbackPalette();

     return {
          primary: {
               50: palette.primary[50],
               100: palette.primary[100],
               200: palette.primary[200],
               300: palette.primary[300],
               400: palette.primary[400],
               500: palette.primary[500],
               600: palette.primary[600],
               700: palette.primary[700],
               800: palette.primary[800],
               900: palette.primary[900],
               '500-text': palette.primary['500-text'],
               base: palette.primary.base,
               baseContrast: palette.primary.baseContrast,
               raw: palette.primary,
          },
          secondary: {
               50: palette.secondary[50],
               100: palette.secondary[100],
               200: palette.secondary[200],
               300: palette.secondary[300],
               400: palette.secondary[400],
               500: palette.secondary[500],
               600: palette.secondary[600],
               700: palette.secondary[700],
               800: palette.secondary[800],
               900: palette.secondary[900],
               '500-text': palette.secondary['500-text'],
               base: palette.secondary.base,
               baseContrast: palette.secondary.baseContrast,
               raw: palette.secondary,
          },
          tertiary: {
               50: palette.tertiary[50],
               100: palette.tertiary[100],
               200: palette.tertiary[200],
               300: palette.tertiary[300],
               400: palette.tertiary[400],
               500: palette.tertiary[500],
               600: palette.tertiary[600],
               700: palette.tertiary[700],
               800: palette.tertiary[800],
               900: palette.tertiary[900],
               '500-text': palette.tertiary['500-text'],
               base: palette.tertiary.base,
               baseContrast: palette.tertiary.baseContrast,
               raw: palette.tertiary,
          },
     };
}

/**
 * Returns `darkValue` when the current theme color mode is dark, otherwise `lightValue`.
 * @param lightValue
 * @param darkValue
 */
export function useColorModeValue(lightValue, darkValue) {
     const { colorMode } = useThemeState();
     return colorMode === 'dark' ? darkValue : lightValue;
}

/**
 * Converts a [primary, secondary, tertiary] palette array (as returned by the theme API) into a
 * keyed {primary, secondary, tertiary} object.
 * @param response array of up to 3 color swatches
 * @returns {{primary, secondary, tertiary}}
 */
function normalizeThemeColors(response = []) {
     return {
          primary: response?.[0] ?? null,
          secondary: response?.[1] ?? null,
          tertiary: response?.[2] ?? null,
     };
}

// App.js, Splash.js, and Loading.js each independently read theme_state/location, decide whether a
// refetch is needed, and persist a freshly-resolved theme, with no coordination between them --
// Splash's fetch-and-save is never cancelled on unmount, so it can still be mid-flight when
// Loading's runs right after. If two of these cycles overlap, one can read theme_state before the
// other's write has landed, see a stale/mismatched locationId, and (via getThemeInfo's own
// themes[0] fallback) overwrite a just-saved correct theme with whichever theme happens to be
// first in the catalog. Routing every read-decide-persist cycle through this queue serializes
// them, so each cycle's initial read always reflects the previous cycle's completed write.
let themeInitQueue = Promise.resolve();

/**
 * Runs `fn` only after any previously queued theme-init cycle has settled, so concurrent
 * init cycles (from App.js/Splash.js/Loading.js) never interleave.
 * @param fn function (may be async) to run exclusively
 * @returns {Promise} the result of `fn`
 */
export function runExclusiveThemeInit(fn) {
     const run = themeInitQueue.then(fn);
     themeInitQueue = run.catch(() => {});
     return run;
}

/**
 * Fetches theme info for a library/location and builds a ready-to-apply theme runtime from it.
 * @param url library base URL (optional)
 * @param locationId library location id (optional)
 * @returns {Promise<{theme, themeColors, themeId, locationId, header}>}
 */
export async function buildThemeForLibrary(url = null, locationId = null) {
     const response = await getThemeInfo(url, locationId);
     const themeColors = normalizeThemeColors(response?.palettes);
     const theme = buildThemeRuntime(themeColors);
     return {
          theme,
          themeColors,
          themeId: response?.themeId ?? Number(GLOBALS.themeId ?? 1),
          locationId: response?.locationId ?? null,
          header: response?.header ?? null,
     };
}

/**
 * Builds a themeColors + theme runtime pair from a single theme_catalog entry
 * ({id, themeId, name, baseMode, logo, header, primary, secondary, tertiary}).
 * @param themeEntry
 * @returns {{id, themeId, name, baseMode, logo, header, themeColors, theme}}
 */
export function buildThemeConfigFromCatalogEntry(themeEntry = {}) {
     const themeColors = {
          primary: buildSwatchFromThemeTokens(themeEntry?.primary),
          secondary: buildSwatchFromThemeTokens(themeEntry?.secondary),
          tertiary: buildSwatchFromThemeTokens(themeEntry?.tertiary),
     };

     return {
          id: themeEntry?.id ?? null,
          themeId: themeEntry?.themeId ?? themeEntry?.id ?? null,
          name: themeEntry?.name ?? null,
          baseMode: themeEntry?.baseMode ?? null,
          logo: themeEntry?.logo ?? null,
          header: themeEntry?.header ?? null,
          themeColors,
          theme: buildThemeRuntime(themeColors),
     };
}

/**
 * Builds a ready-to-apply theme config for every theme available at a location, from the locally
 * stored theme catalog.
 * @param locationId
 * @returns {Promise<Array>}
 */
export async function loadThemeConfigsForLocation(locationId) {
     const themes = await loadThemeCatalog(locationId);
     return themes.map(buildThemeConfigFromCatalogEntry);
}

/**
 * Read-only theme accessor. Derives the current theme runtime, CSS variables, brand color scales,
 * and resolved neutral colors from theme state.
 * @returns {{theme, themeVars, brand, neutralPairs, neutrals, themeColors, themeId, colorMode, textColor, header, tokens}}
 */
export function useThemeForDisplay() {
     const { themeColors, colorMode, textColor, themeId, header } = useThemeState();
     const theme = React.useMemo(() => buildThemeRuntime(themeColors), [themeColors]);
     const themeVars = React.useMemo(() => buildThemeVars(themeColors), [themeColors]);
     const brand = React.useMemo(() => buildRuntimeColorMap(themeColors), [themeColors]);
     const neutralPairs = React.useMemo(() => buildUiColorMap(), []);
     const neutrals = React.useMemo(() => resolveUiColorMap(neutralPairs, colorMode), [neutralPairs, colorMode]);
     // Full token tree: static primitives/semanticTokens/componentTokens plus the current brand
     // palette under dynamicBrandPalette.
     const tokens = React.useMemo(() => ({
          primitives: TOKENS.primitives,
          dynamicBrandPalette: brand,
          semanticTokens: TOKENS.semanticTokens,
          componentTokens: TOKENS.componentTokens,
     }), [brand]);

     return {
          theme,
          themeVars,
          brand,
          neutralPairs,
          neutrals,
          themeColors,
          themeId,
          colorMode,
          textColor,
          header,
          tokens,
     };
}

/**
 * Theme accessor with mutators. Extends useThemeForDisplay's fields with updateTheme (apply new
 * brand colors), updateColorMode (switch light/dark), resetTheme, and forceRefreshTheme (re-fetch
 * the theme from the library and persist it, serialized via runExclusiveThemeInit).
 * @returns {{theme, themeVars, brand, neutralPairs, neutrals, themeColors, themeId, colorMode, textColor, header, tokens, updateTheme, updateColorMode, resetTheme, forceRefreshTheme}}
 */
export function useTheme() {
     const { theme, themeVars, brand, neutralPairs, neutrals, themeColors, themeId, colorMode, textColor, header, tokens } = useThemeForDisplay();
     const updateThemeColors = useUpdateThemeColors();
     const updateColorModeValue = useUpdateThemeColorMode();
     const resetThemeState = useResetThemeState();

     const updateTheme = React.useCallback(async (data, themeId, locationId, header) => {
          const primary = data?.tokens?.colors?.primary;
          const secondary = data?.tokens?.colors?.secondary;
          const tertiary = data?.tokens?.colors?.tertiary;
          if (!primary || !secondary || !tertiary) {
               return;
          }
          // themeId/locationId/header are optional; any omitted value leaves the already-stored
          // value untouched.
          await updateThemeColors(
               { primary, secondary, tertiary },
               themeId,
               locationId,
               header
          );
     }, [updateThemeColors]);

     const updateColorMode = React.useCallback(async (mode) => {
          Uniwind.setTheme(mode);
          await updateColorModeValue(mode);
     }, [updateColorModeValue]);

     const resetTheme = React.useCallback(async () => {
          await resetThemeState();
     }, [resetThemeState]);

     const forceRefreshTheme = React.useCallback(async (url = null, locationId = null) => {
          return runExclusiveThemeInit(async () => {
               const builtTheme = await buildThemeForLibrary(url, locationId);
               await updateTheme(builtTheme.theme, builtTheme.themeId, builtTheme.locationId, builtTheme.header);
               return builtTheme;
          });
     }, [updateTheme]);

     return {
          theme,
          themeVars,
          brand,
          neutralPairs,
          neutrals,
          themeColors,
          themeId,
          colorMode,
          textColor,
          header,
          tokens,
          updateTheme,
          updateColorMode,
          resetTheme,
          forceRefreshTheme,
     };
}

/** Theme cache staleness threshold, in milliseconds (12 hours). */
export const THEME_STALE_MS = 12 * 60 * 60 * 1000;
