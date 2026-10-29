import { Easing, staticFile } from "remotion";

// Opponium brand: pure black ink on white, one functional green for "done" moments only.
export const C = {
  ink: "#000000",
  paper: "#ffffff",
  g50: "#fafafa",
  g100: "#f4f4f4",
  g200: "#e6e6e6",
  g300: "#d6d6d6",
  g500: "#8a8a8a",
  g600: "#6b6b6b",
  g700: "#4a4a4a",
  ok: "#1f8a4c",
  warn: "#b07a12",
};

export const FPS = 30;
export const BEAT = 15; // 120 BPM

// GSAP ease names translated to frame-driven beziers
export const E = {
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  power4Out: Easing.bezier(0.22, 1, 0.36, 1),
  expoIn: Easing.bezier(0.7, 0, 0.84, 0),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  backOut: Easing.bezier(0.34, 1.36, 0.64, 1),
};

export const fontCss = `
@font-face{font-family:Jost;font-weight:500;src:url(${staticFile("fonts/jost-latin-500-normal.woff2")})}
@font-face{font-family:Jost;font-weight:600;src:url(${staticFile("fonts/jost-latin-600-normal.woff2")})}
@font-face{font-family:Jost;font-weight:700;src:url(${staticFile("fonts/jost-latin-700-normal.woff2")})}
@font-face{font-family:Plex;font-weight:400;src:url(${staticFile("fonts/ibm-plex-sans-latin-400-normal.woff2")})}
@font-face{font-family:Plex;font-weight:500;src:url(${staticFile("fonts/ibm-plex-sans-latin-500-normal.woff2")})}
@font-face{font-family:Plex;font-weight:600;src:url(${staticFile("fonts/ibm-plex-sans-latin-600-normal.woff2")})}
*{box-sizing:border-box}
`;
