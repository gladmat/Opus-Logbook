import { Specialty } from "@/types/case";

// SVG path data for each specialty icon
// All icons are 24x24 viewBox, stroke-based, no fills (except small accent dots)
export const SPECIALTY_ICON_PATHS: Record<
  Specialty,
  {
    strokes: Array<{ d: string; strokeWidth: number }>;
    circles?: Array<{ cx: number; cy: number; r: number; fill?: boolean }>;
  }
> = {
  breast: {
    strokes: [
      {
        d: "M6 13C6 17 9 20 12 20C15 20 18 17 18 13C18 10 16 8 14 8",
        strokeWidth: 1.8,
      },
      { d: "M12 20C12 20 11 13 14 8", strokeWidth: 1.26 },
      { d: "M4 10C5 11 6 13 6 13", strokeWidth: 1.26 },
    ],
    circles: [{ cx: 12, cy: 14, r: 1.5 }],
  },
  hand_wrist: {
    strokes: [
      { d: "M9 21V18", strokeWidth: 1.8 },
      { d: "M15 21V18", strokeWidth: 1.8 },
      {
        d: "M8 17C8 16 9 15 12 15C15 15 16 16 16 17",
        strokeWidth: 1.8,
      },
      { d: "M7 16L5 14L4 11L5 10", strokeWidth: 1.8 },
      { d: "M8 15L7 6C7 5 8 5 8.5 6L9.5 15", strokeWidth: 1.8 },
      {
        d: "M10.5 15L11 4C11 3 12 3 12.5 4L13 15",
        strokeWidth: 1.8,
      },
      {
        d: "M14 15L14.5 5C14.5 4 15.5 4 16 5L15 15",
        strokeWidth: 1.8,
      },
      { d: "M16 16L18 10L18.5 9", strokeWidth: 1.8 },
      { d: "M9.5 15L10.5 15", strokeWidth: 1.8 },
      { d: "M13 15L14 15", strokeWidth: 1.8 },
    ],
  },
  aesthetics: {
    strokes: [
      {
        d: "M12 4C10 4 9 6 9 8C9 8.5 7.5 9.5 8 11C8.2 11.6 9 11.5 9 12",
        strokeWidth: 1.8,
      },
      { d: "M9 12C8.5 12.5 8.5 13.5 9 14", strokeWidth: 1.8 },
      {
        d: "M9 14C8.5 15 9 16 10 16C12 16 14 14 15 11",
        strokeWidth: 1.8,
      },
      { d: "M10 16L10 20", strokeWidth: 1.8 },
      { d: "M12 9C12.5 8.5 13.5 8.5 14 9", strokeWidth: 1.26 },
    ],
  },
  head_neck: {
    strokes: [
      {
        d: "M16 10C16 6 14 3 11 3C8 3 6 6 6 9L7 12",
        strokeWidth: 1.8,
      },
      { d: "M7 12L9 15H13L15 11", strokeWidth: 1.8 },
      { d: "M9 15L8 21", strokeWidth: 1.8 },
      { d: "M13 15L16 21", strokeWidth: 1.8 },
      { d: "M11 16L13 20", strokeWidth: 1.26 },
    ],
  },
  orthoplastic: {
    strokes: [
      {
        d: "M8 4C7 6 7 14 8 18L9 21H13L14 18",
        strokeWidth: 1.8,
      },
      { d: "M14 4C15 6 15 11 14 14", strokeWidth: 1.8 },
      {
        d: "M16 14C18 14 19 15 19 16C19 17 18 18 16 18",
        strokeWidth: 1.8,
      },
      { d: "M16 16H14", strokeWidth: 1.26 },
    ],
  },
  burns: {
    strokes: [
      {
        d: "M12 21C15 21 17 19 17 16C17 13 14 11 14 8C14 6 13 5 12 3C11 5 10 6 10 8C10 11 7 13 7 16C7 19 9 21 12 21Z",
        strokeWidth: 1.8,
      },
      {
        d: "M12 18C13.5 18 14.5 17 14.5 15.5C14.5 14 13.5 13 12 12C10.5 13 9.5 14 9.5 15.5C9.5 17 10.5 18 12 18Z",
        strokeWidth: 1.26,
      },
    ],
    circles: [
      { cx: 17, cy: 6, r: 1, fill: true },
      { cx: 6, cy: 9, r: 0.8, fill: true },
    ],
  },
  body_contouring: {
    strokes: [
      {
        d: "M7 6C7 9 9 10 9 12C9 14 7 15 7 18V21",
        strokeWidth: 1.8,
      },
      {
        d: "M17 6C17 9 15 10 15 12C15 14 17 15 17 18V21",
        strokeWidth: 1.8,
      },
      { d: "M9 8C10 9 11 9 12 9", strokeWidth: 1.26 },
      { d: "M12 9C13 9 14 9 15 8", strokeWidth: 1.26 },
    ],
    circles: [{ cx: 12, cy: 13, r: 0.5, fill: true }],
  },
  cleft_cranio: {
    // Face profile with cleft indicator
    strokes: [
      {
        d: "M12 3C8 3 6 6 6 10C6 13 7 15 9 17L10 19H14L15 17C17 15 18 13 18 10C18 6 16 3 12 3Z",
        strokeWidth: 1.8,
      },
      { d: "M10 11C10 12 11 13 12 13C13 13 14 12 14 11", strokeWidth: 1.26 },
      { d: "M12 13V15.5", strokeWidth: 1.26 },
      { d: "M10.5 16C11 16.5 13 16.5 13.5 16", strokeWidth: 1.26 },
    ],
    circles: [
      { cx: 9.5, cy: 8, r: 0.8, fill: true },
      { cx: 14.5, cy: 8, r: 0.8, fill: true },
    ],
  },
  skin_cancer: {
    // Sun icon (circle with radiating lines)
    strokes: [
      { d: "M12 2V4", strokeWidth: 1.8 },
      { d: "M12 20V22", strokeWidth: 1.8 },
      { d: "M4 12H2", strokeWidth: 1.8 },
      { d: "M22 12H20", strokeWidth: 1.8 },
      { d: "M5.64 5.64L4.22 4.22", strokeWidth: 1.26 },
      { d: "M19.78 19.78L18.36 18.36", strokeWidth: 1.26 },
      { d: "M18.36 5.64L19.78 4.22", strokeWidth: 1.26 },
      { d: "M4.22 19.78L5.64 18.36", strokeWidth: 1.26 },
    ],
    circles: [{ cx: 12, cy: 12, r: 5 }],
  },
  lymphoedema: {
    // Droplet/teardrop shape
    strokes: [
      {
        d: "M12 3L6 12C6 16.5 8.5 20 12 20C15.5 20 18 16.5 18 12L12 3Z",
        strokeWidth: 1.8,
      },
      {
        d: "M10 14C10 15.5 11 16.5 12 16.5C13 16.5 14 15.5 14 14",
        strokeWidth: 1.26,
      },
    ],
  },
  peripheral_nerve: {
    // Lightning/zap icon (nerve signal)
    strokes: [
      { d: "M13 2L4 14H12L11 22L20 10H12L13 2Z", strokeWidth: 1.8 },
    ],
  },
  general: {
    strokes: [
      { d: "M5 20L11 14", strokeWidth: 1.8 },
      { d: "M7 20L13 14", strokeWidth: 1.8 },
      { d: "M5 20L7 22", strokeWidth: 1.8 },
      { d: "M11 14L14 11", strokeWidth: 1.8 },
      { d: "M13 14L15 12", strokeWidth: 1.26 },
      {
        d: "M14 11L20 5C20.5 4.5 21.5 5.5 21 6C20 8 18 10 16 11",
        strokeWidth: 1.8,
      },
    ],
  },
};
