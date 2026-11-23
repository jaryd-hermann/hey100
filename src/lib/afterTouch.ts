/** Run after the current touch has finished.
 * Presenting a modal or pushing a screen inside the touch leaves an invisible
 * iOS shield that ignores every later tap until the app is killed. */
export function afterTouch(task: () => void) {
  setTimeout(task, 0);
}
