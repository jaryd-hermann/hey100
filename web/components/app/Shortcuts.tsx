'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const KEYS = [
  { keys: ['←'], label: 'Pass this listing' },
  { keys: ['→'], label: 'Say hey' },
  { keys: ['↑'], label: 'Play the pitch' },
  { keys: ['↓'], label: 'Open the store link' },
  { keys: ['⌘', 'H'], label: 'Heys' },
  { keys: ['⌘', 'M'], label: 'Messages' },
  { keys: ['⌘', 'C'], label: 'Community' },
  { keys: ['⌘', 'F'], label: 'Feedback' },
  { keys: ['?'], label: 'Open this menu' },
  { keys: ['esc'], label: 'Close a sheet' },
] as const;

const JUMP: Record<string, string> = {
  f: '/feedback',
  c: '/community',
  h: '/heys',
  m: '/chat',
};

export function useAppShortcuts() {
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        setMenu((value) => !value);
        return;
      }
      if (event.key === 'Escape') {
        setMenu(false);
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const path = JUMP[event.key.toLowerCase()];
      if (!path) return;
      event.preventDefault();
      router.push(path);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return { menu, setMenu };
}

export function NavKeys({ onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button className="keys-nav is-min" type="button" onClick={() => setOpen(true)} aria-label="Show shortcuts">
        <span className="keycaps">
          <kbd>⌘</kbd>
        </span>
      </button>
    );
  }

  return (
    <div className="keys-nav">
      <button className="keys-nav-hit" type="button" onClick={onOpen} aria-label="Keyboard shortcuts">
        <span className="keycaps">
          <kbd>⌘</kbd>
          <kbd>H</kbd>
          <kbd>M</kbd>
          <kbd>?</kbd>
        </span>
      </button>
      <button className="keys-nav-x" type="button" onClick={() => setOpen(false)} aria-label="Minimize shortcuts">
        ×
      </button>
    </div>
  );
}

export function ShortcutsMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div
        className="modal-card shortcuts-modal"
        role="dialog"
        aria-labelledby="keys-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 id="keys-title">Keyboard shortcuts</h2>
        <p className="muted">Command shortcuts work from anywhere in the app.</p>
        <ul className="shortcut-list">
          {KEYS.map((row) => (
            <li key={row.label}>
              <span className="keycaps">
                {row.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
