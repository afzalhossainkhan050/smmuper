import React, { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        gsiPromise = null;
        reject(new Error('Google sign-in script failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

/**
 * "Sign in with Google" button. Renders nothing unless the admin has enabled
 * Google login (and entered a Client ID) in Admin → Google Login.
 */
export default function GoogleSignInButton({ onCredential, text = 'signin_with', disabled = false }) {
  const holderRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [clientId, setClientId] = useState(null);

  callbackRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    api.auth.getGoogleConfig()
      .then((res) => {
        if (!cancelled && res?.enabled && res.client_id) setClientId(res.client_id);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !holderRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) callbackRef.current?.(response.credential);
          },
          ux_mode: 'popup',
          auto_select: false,
        });
        const width = Math.min(400, Math.max(200, holderRef.current.offsetWidth || 320));
        holderRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(holderRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
          width,
        });
      })
      .catch(() => setClientId(null));

    return () => { cancelled = true; };
  }, [clientId, text]);

  if (!clientId) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        <span className="h-px flex-1 bg-border-main" />
        <span>or</span>
        <span className="h-px flex-1 bg-border-main" />
      </div>
      <div className={disabled ? 'opacity-60 pointer-events-none' : ''}>
        <div ref={holderRef} className="flex justify-center min-h-[44px]" />
      </div>
    </div>
  );
}
