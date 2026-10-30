import { describe, expect, it } from 'vitest';
import { DEVICE_PRESETS } from '../src/data/types';
import { DEVICES } from './capture-devices.mjs';

describe('capture', () => {
  it('shoots at exactly the sizes the demo shows, so a capture fills its device', () => {
    expect(DEVICES.map(({ id, width, height }) => ({ id, width, height }))).toEqual(DEVICE_PRESETS);
  });
});
