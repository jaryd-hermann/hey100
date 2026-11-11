import { BRIDGES } from './look';
import { LAST_STEP } from './steps';

/** A normal onboarding step. Bridges and the last step pay more. */
const STEP = 10;
const BRIDGE = 25;
const LAST = 50;

/** Blocks for arriving at `step` the first time. Step 0 pays nothing. */
export function blockGain(step: number): number {
  if (step <= 0) return 0;
  if (BRIDGES[step]) return BRIDGE;
  if (step >= LAST_STEP) return LAST;
  return STEP;
}

/** Total for every step from 1 through `step`, inclusive. */
export function blocksThrough(step: number): number {
  let total = 0;
  for (let index = 1; index <= step; index += 1) total += blockGain(index);
  return total;
}
