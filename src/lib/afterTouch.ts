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

/** Run only after iOS has finished the touch.
 * Opening a screen in the touch handler can leave the app unable to take taps. */
export function afterTouch(task: () => void) {
  setTimeout(() => {
    requestAnimationFrame(() => {
      task();
    });
  }, 48);
}
