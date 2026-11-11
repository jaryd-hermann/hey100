'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { APP_STORE_URL, SITE } from '@/lib/site';

const IosContext = createContext<{ openIos: () => void }>({ openIos: () => {} });

export function useIos() {
  return useContext(IosContext);
}

export function IosProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <IosContext.Provider value={{ openIos: () => setOpen(true) }}>
      {children}
      <IosModal open={open} onClose={() => setOpen(false)} />
    </IosContext.Provider>
  );
}

export function IosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const store = APP_STORE_URL || 'https://apps.apple.com/search?term=hey100';
  const share = `${SITE}/`;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-labelledby="ios-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <img className="modal-icon" src="/icons/hey-wordmark.png" alt="" />
        <h2 id="ios-title">Get Hey100 on your iPhone</h2>
        <p>Scan with your camera to open the App Store. Your apps, matches and chats sync to the app.</p>
        <img
          className="modal-qr"
          alt="QR code for the App Store listing"
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(store)}`}
        />
        <div className="modal-or">
          <span />
          or
          <span />
        </div>
        <div className="modal-actions">
          <a className="btn-ink" href={store}>
            Open App Store
          </a>
          <button
            className="btn-line"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(share);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? 'Copied' : 'Copy hey100.com'}
          </button>
        </div>
      </div>
    </div>
  );
}
