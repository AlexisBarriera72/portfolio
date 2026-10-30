/**
 * The sizes `npm run capture` shoots at, and whether each is a touch screen.
 * They are the demo's device sizes (src/data/types.ts → DEVICE_PRESETS);
 * scripts/capture.test.ts keeps the two equal.
 */
export const DEVICES = [
  { id: 'phone', width: 390, height: 844, mobile: true },
  { id: 'tablet', width: 820, height: 1180, mobile: true },
  { id: 'desktop', width: 1280, height: 800, mobile: false },
];
