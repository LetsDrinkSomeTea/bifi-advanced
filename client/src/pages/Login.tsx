import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth, useAuthConfig } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/utils';

export function Login() {
  const { user, isLoading } = useAuth();
  const { data: config, isLoading: configLoading } = useAuthConfig();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-redirect to IDP when OIDC is the only option and OIDC_AUTO_REDIRECT is set
  useEffect(() => {
    if (!config || isLoading || user) return;
    if (config.oidcEnabled && !config.localEnabled && config.autoRedirect) {
      window.location.href = '/api/auth/login';
    }
  }, [config, isLoading, user]);

  if (isLoading || configLoading) return null;

  if (user) {
    navigate('/');
    return null;
  }

  const showOIDC = config?.oidcEnabled ?? true;
  const showLocal = config?.localEnabled ?? true;

  const handleSSOLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/local/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Anmeldung fehlgeschlagen');
        return;
      }

      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/');
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setSubmitting(false);
    }
  };

  const searchParams = new URLSearchParams(window.location.search);
  const urlError = searchParams.get('error');
  const errorMessages: Record<string, string> = {
    oidc_not_configured: 'SSO ist nicht konfiguriert.',
    invalid_state: 'Ungültige Sitzung. Bitte erneut versuchen.',
    auth_failed: 'Authentifizierung fehlgeschlagen.',
    deactivated: 'Dein Account wurde deaktiviert.',
    no_claims: 'Ungültige SSO-Antwort.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">🍺 BiFi</h1>
          <p className="text-muted-foreground text-sm">Vereins-Getränkeliste</p>
        </div>

        {(error || urlError) && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error ?? (urlError ? (errorMessages[urlError] ?? 'Ein Fehler ist aufgetreten.') : '')}
          </div>
        )}

        {showOIDC && (
          <button
            onClick={handleSSOLogin}
            className="w-full py-2.5 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            Mit SSO anmelden
          </button>
        )}

        {showOIDC && showLocal && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">oder lokal anmelden</span>
            </div>
          </div>
        )}

        {showLocal && (
          <form onSubmit={handleLocalLogin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">E-Mail oder Benutzername</label>
              <input
                type="text"
                value={login}
                onChange={(e) => { setLogin(e.target.value); }}
                className={cn(
                  'w-full px-3 py-2 rounded-md border bg-background text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                  'border-input',
                )}
                placeholder="name@verein.de"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
                className={cn(
                  'w-full px-3 py-2 rounded-md border bg-background text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                  'border-input',
                )}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !login || !password}
              className="w-full py-2.5 px-4 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
