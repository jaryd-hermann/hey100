let claimed = false;

/** A nested control, such as a link inside a message, handled this touch. */
export function claimTouch() {
  claimed = true;
}

/** True once per claim. Later callers see a fresh touch. */
export function touchClaimed() {
  const was = claimed;
  claimed = false;
  return was;
}

/** Run only after iOS has released the touch.
 * Pushing a screen inside the touch leaves the window unable to take taps. */
export function afterTouch(task: () => void) {
  setTimeout(task, 80);
}
