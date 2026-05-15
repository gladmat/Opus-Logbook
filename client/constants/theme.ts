import { Platform } from "react-native";

// ── Raw Color Scales ─────────────────────────────────────────────────────────
// Canonical amber: #E5A00D (golden amber)
// NOT #D97706 (burnt orange) — that was a previous draft value.

export const palette = {
  charcoal: {
    950: "#0C0F14", // Deepest background — app canvas
    900: "#161B22", // Card/surface background
    850: "#1C2128", // Raised surface, active items
    800: "#2D333B", // Borders, dividers
    750: "#444C56", // Active borders, hover, emphasis
    700: "#4B5563", // Disabled text on dark
    500: "#656D76", // Placeholder text, tertiary
    400: "#8B949E", // Secondary text
    300: "#AFB8C1", // Light mode active borders
    200: "#D0D7DE", // Light mode borders
    100: "#ECEEF1", // Light mode tertiary bg
    50: "#F6F8FA", // Light mode surface
    25: "#FFFFFF", // Light mode background
  },
  amber: {
    900: "#78350F", // Dark amber bg (chips/badges on dark mode)
    800: "#92400E", // Deep amber
    700: "#B47E00", // Light mode primary accent
    600: "#E5A00D", // ★ THE brand colour — dark mode primary accent
    500: "#F0B429", // Hover/emphasis states, focus rings
    400: "#F7C948", // Charts, highlights
    200: "#FDE68A", // Light amber tint
    100: "#FEF3C7", // Light mode amber background
    50: "#FFFBEB", // Lightest amber wash
  },
  white: "#FFFFFF",
  black: "#000000",
} as const;

// ── Theme Colors ─────────────────────────────────────────────────────────────

export const Colors = {
  light: {
    text: "#1F2328",
    textSecondary: "#656D76",
    textTertiary: "#8B949E",
    buttonText: "#FFFFFF",
    accent: "#E5A00D",
    tabIconDefault: "#8B949E",
    tabIconSelected: "#B47E00",
    link: "#B47E00",
    linkPressed: "#E5A00D",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F6F8FA",
    backgroundTertiary: "#ECEEF1",
    backgroundElevated: "#FFFFFF",
    accentContrast: "#1A1A2E",
    success: "#1A7F37",
    warning: "#9A6700",
    error: "#CF222E",
    destructiveMuted: "#9B2C2C",
    info: "#0969DA",
    border: "#D0D7DE",
    cardShadow: "rgba(12,15,20,0.1)",
    // Modal/sheet scrim overlay — used behind modals to dim the form. Set
    // here rather than hardcoded "rgba(0,0,0,0.5)" so callsites don't
    // depend on raw values (audit P2.3).
    scrim: "rgba(12,15,20,0.45)",
    // Tinted "surface" variants of semantic colors for banners/badges.
    // Pre-baked alpha rather than the `theme.color + "NN"` string-concat
    // pattern, which is brittle if a token ever switches to rgb() / oklch().
    accentSurface: "rgba(180,126,0,0.12)",
    warningSurface: "rgba(154,103,0,0.12)",
    errorSurface: "rgba(207,34,46,0.12)",
    successSurface: "rgba(26,127,55,0.12)",
    infoSurface: "rgba(9,105,218,0.12)",
    rolePrimary: "#B47E00",
    roleSupervising: "#8250DF",
    roleAssistant: "#1A7F37",
    roleTrainee: "#0969DA",
    specialty: {
      breast: "#8250DF",
      hand_wrist: "#0969DA",
      head_neck: "#BF5700",
      cleft_cranio: "#E11D48",
      skin_cancer: "#B45309",
      orthoplastic: "#1A7F37",
      burns: "#953800",
      lymphoedema: "#0D9488",
      body_contouring: "#CF222E",
      aesthetics: "#BF3989",
      peripheral_nerve: "#7C3AED",
      general: "#656D76",
    },
    // Skin cancer pathology category badges — semantic distinguishers for
    // multi-lesion sessions. Pattern mirrors theme.specialty (5 categories
    // each with light + dark variants).
    pathology: {
      bcc: "#2563EB", // BCC — blue
      scc: "#B47E00", // SCC — amber (matches light mode accent)
      melanoma: "#7C3AED", // Melanoma — purple
      benign: "#059669", // Benign — green
      other: "#6B7280", // Other / unspecified — grey
    },
    // Burn depth — semantic clinical signal (lighter in light mode).
    burnDepth: {
      superficial: "#FFB3BA", // Sunburn / superficial-partial — pink
      deepPartial: "#FF6B6B", // Deep partial — red
      fullThickness: "#CC0000", // Full-thickness / subdermal — deep red
      mixed: "#FF8844", // Mixed depth — orange
    },
    // Nerve injury severity — used in the brachial plexus diagram. Most
    // grades map to existing semantic tokens (success/warning/error); only
    // "rupture" needs its own colour because it sits between warning and
    // error on the severity ladder.
    nerveSeverity: {
      rupture: "#C4632B",
    },
  },
  dark: {
    text: "#E6EDF3",
    textSecondary: "#8B949E",
    textTertiary: "#656D76",
    buttonText: "#0C0F14",
    accent: "#E5A00D",
    tabIconDefault: "#656D76",
    tabIconSelected: "#E5A00D",
    link: "#E5A00D",
    linkPressed: "#F0B429",
    backgroundRoot: "#0C0F14",
    backgroundDefault: "#161B22",
    backgroundSecondary: "#1C2128",
    backgroundTertiary: "#2D333B",
    backgroundElevated: "#161B22",
    accentContrast: "#1A1A2E",
    success: "#2EA043",
    warning: "#D29922",
    error: "#F85149",
    destructiveMuted: "#9B2C2C",
    info: "#58A6FF",
    border: "#2D333B",
    cardShadow: "rgba(0,0,0,0.35)",
    // See light theme above for the rationale on these tokens.
    scrim: "rgba(0,0,0,0.55)",
    accentSurface: "rgba(229,160,13,0.14)",
    warningSurface: "rgba(210,153,34,0.14)",
    errorSurface: "rgba(248,81,73,0.14)",
    successSurface: "rgba(46,160,67,0.14)",
    infoSurface: "rgba(88,166,255,0.14)",
    rolePrimary: "#E5A00D",
    roleSupervising: "#D8B4FE",
    roleAssistant: "#86EFAC",
    roleTrainee: "#7DD3FC",
    specialty: {
      breast: "#D8B4FE",
      hand_wrist: "#7DD3FC",
      head_neck: "#FDBA74",
      cleft_cranio: "#FDA4AF",
      skin_cancer: "#FBBF24",
      orthoplastic: "#86EFAC",
      burns: "#F97316",
      lymphoedema: "#5EEAD4",
      body_contouring: "#FB7185",
      aesthetics: "#F9A8D4",
      peripheral_nerve: "#A78BFA",
      general: "#94A3B8",
    },
    // See light theme for token rationale.
    pathology: {
      bcc: "#2563EB",
      scc: "#E5A00D", // SCC — amber (matches dark mode accent)
      melanoma: "#7C3AED",
      benign: "#059669",
      other: "#6B7280",
    },
    // Same burn-depth palette as light mode — the depth gradient is
    // saturated enough to read on either background. Surgeons learn the
    // sunburn-pink → red → deep-red mapping in trauma training so we
    // preserve it regardless of theme.
    burnDepth: {
      superficial: "#FFB3BA",
      deepPartial: "#FF6B6B",
      fullThickness: "#CC0000",
      mixed: "#FF8844",
    },
    nerveSeverity: {
      rupture: "#E5883E", // Brighter in dark mode for legibility on charcoal
    },
  },
};

// ── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
  touchTarget: 48,
};

// ── Border Radius ────────────────────────────────────────────────────────────

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  "2xl": 40,
  full: 9999,
};

// ── Typography ───────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Typography = {
  display: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodySemibold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    letterSpacing: 0.1,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  mono: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    fontFamily: Fonts?.mono,
  },
};

// ── Shadows ──────────────────────────────────────────────────────────────────

export const Shadows = {
  card: {
    shadowColor: palette.charcoal[950],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  floating: {
    shadowColor: palette.charcoal[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modal: {
    shadowColor: palette.charcoal[950],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};
