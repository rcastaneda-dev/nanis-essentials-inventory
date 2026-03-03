import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LoginPageProps {
  onSignInWithPassword: (email: string, password: string) => Promise<void>;
  onSignInWithOtp: (email: string) => Promise<void>;
}

export function LoginPage({ onSignInWithPassword, onSignInWithOtp }: LoginPageProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (useMagicLink) {
        await onSignInWithOtp(email);
        setMagicLinkSent(true);
      } else {
        await onSignInWithPassword(email, password);
      }
    } catch {
      setError(t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t('auth.welcome')}</h1>
        </div>

        {magicLinkSent ? (
          <p style={styles.success}>{t('auth.magicLinkSent')}</p>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={styles.input}
                data-testid="auth-email-input"
              />
            </div>

            {!useMagicLink && (
              <div style={styles.field}>
                <label style={styles.label}>{t('auth.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={styles.input}
                  data-testid="auth-password-input"
                />
              </div>
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
              }}
              data-testid="auth-submit-btn"
            >
              {loading
                ? '...'
                : useMagicLink
                  ? t('auth.sendMagicLink')
                  : t('auth.signInWithPassword')}
            </button>

            <button
              type="button"
              onClick={() => {
                setUseMagicLink(!useMagicLink);
                setError('');
              }}
              style={styles.toggleLink}
              data-testid="auth-toggle-mode"
            >
              {useMagicLink ? t('auth.usePassword') : t('auth.useMagicLink')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg)',
    padding: '16px',
  },
  card: {
    background: 'var(--card)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-lg)',
    padding: '40px 32px',
    width: '100%',
    maxWidth: '400px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--muted)',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--input-border)',
    fontSize: '14px',
    color: 'var(--input-text)',
    background: 'var(--input-bg)',
    outline: 'none',
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--primary)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  toggleLink: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px 0',
    textAlign: 'center' as const,
  },
  error: {
    color: 'var(--danger)',
    fontSize: '13px',
    margin: 0,
    textAlign: 'center' as const,
  },
  success: {
    color: 'var(--green)',
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '20px 0',
  },
};
