// client/theme/tokens.ts
// LOCKED — do not modify without design sign-off
// (Reconciled 2026-07-16: background.primary aligned to the shipped
// charcoal root; the commented-out accent surface/glow values promoted to
// real tokens so components stop hardcoding the rgba strings.)
// Opus onboarding brand token system. Every onboarding component references these names.
// No hex values in component files — only token names.

export const colors = {
  // Backgrounds
  background: {
    primary: "#0C0F14", // Root background for all onboarding screens (palette.charcoal[950])
    elevated: "#1C1C1E", // Cards, input field surfaces
    tertiary: "#2C2C2E", // Disabled states, subtle fills
    pressed: "rgba(255, 255, 255, 0.06)", // Key/press feedback overlay on dark
  },

  // Amber accent — SACRED
  // Use ONLY for: logo arc, CTA button fills, selected card borders, progress bar
  accent: {
    primary: "#E5A00D",
    muted: "#B8820A", // Pressed/active state
    onAccent: "#1A1A1A", // Text placed ON amber backgrounds
    surface: "rgba(229, 160, 13, 0.08)", // Selected card/chip background
    glow: "rgba(229, 160, 13, 0.15)", // Logo glow on welcome screen only
  },

  // Text
  text: {
    primary: "#F2F2F7", // Headlines — NOT pure white (avoids OLED glare)
    secondary: "#AEAEB2", // Supporting text, subheads
    tertiary: "#636366", // Placeholders, skip links, legal text
  },

  // Borders
  border: {
    default: "#38383A", // Cards, dividers, inputs at rest
    focused: "#E5A00D", // Input/card when focused or selected
  },

  // Icons — NOT amber (would dilute the sacred accent)
  icon: {
    default: "#AEAEB2",
    subtle: "#636366",
    surface: "rgba(174, 174, 178, 0.08)", // Circular icon backdrop (privacy trust rows)
  },

  // Warning — DISTINCT from amber to prevent colour collision
  warning: {
    primary: "#F59E0B",
    surface: "#FFFBEB",
  },
} as const;

export const typography = {
  size: {
    xs: 13,
    sm: 15,
    base: 17,
    lg: 22,
    xl: 28,
    xxl: 34,
    hero: 42,
  },
  weight: {
    light: "300" as const,
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
} as const;

export const spacing = {
  // 8pt grid
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 24, // Standard horizontal screen padding
  buttonHeight: 56, // Standard iOS tappable target
  cardRadius: 12,
  inputRadius: 12,
} as const;
