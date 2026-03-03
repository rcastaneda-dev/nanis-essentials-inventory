import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ResetPasswordPageProps {
  onUpdatePassword: (newPassword: string) => Promise<void>;
}

export function ResetPasswordPage({ onUpdatePassword }: ResetPasswordPageProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t('auth.resetPassword.minLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.mismatch'));
      return;
    }

    setLoading(true);
    try {
      await onUpdatePassword(password);
      setSuccess(true);
    } catch {
      setError(t('auth.resetPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t('auth.resetPassword.title')}</h1>
          <p style={styles.subtitle}>{t('auth.resetPassword.subtitle')}</p>
        </div>

        {success ? (
          <p style={styles.success}>{t('auth.resetPassword.success')}</p>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>{t('auth.resetPassword.newPassword')}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                style={styles.input}
                data-testid="reset-password-input"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('auth.resetPassword.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                style={styles.input}
                data-testid="reset-confirm-password-input"
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
              }}
              data-testid="reset-password-submit-btn"
            >
              {loading ? '...' : t('auth.resetPassword.submit')}
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
  subtitle: {
    fontSize: '14px',
    color: 'var(--muted)',
    marginTop: '8px',
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
