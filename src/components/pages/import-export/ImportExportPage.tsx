import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button';
import { PageHeader } from '../../molecules/PageHeader';
import { Heading, Text } from '../../atoms/Typography';
import {
  migrateBackupToSupabase,
  MigrationProgress,
  MigrationResult,
} from '../../../lib/supabase/dataMigration';

interface ImportExportPageProps {
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

const STATUS_ICON: Record<MigrationProgress['status'], string> = {
  pending: '-',
  in_progress: '...',
  done: 'OK',
  error: 'FAIL',
};

export function ImportExportPage({ onExport, onImport, onClear }: ImportExportPageProps) {
  const { t } = useTranslation();
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress[]>([]);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const handleMigrateToSupabase = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      if (
        !window.confirm(
          'This will insert all data from the backup into Supabase alongside existing data. ' +
            'Running this multiple times will create duplicates. Continue?'
        )
      ) {
        return;
      }

      setMigrationRunning(true);
      setMigrationResult(null);
      setMigrationProgress([]);

      try {
        const json = await file.text();
        const result = await migrateBackupToSupabase(json, progress => {
          setMigrationProgress(prev => {
            const idx = prev.findIndex(p => p.entity === progress.entity);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = progress;
              return next;
            }
            return [...prev, progress];
          });
        });
        setMigrationResult(result);
      } catch (err: any) {
        setMigrationResult({ success: false, counts: {}, errors: [err.message] });
      } finally {
        setMigrationRunning(false);
      }
    };
    input.click();
  }, []);

  return (
    <div className="page">
      <PageHeader title={t('importExport.title')} />

      <div className="cards two-cols">
        {/* Export Data Card */}
        <div className="card">
          <div className="card-title">
            <Heading level={3}>{t('importExport.exportData')}</Heading>
          </div>
          <Text variant="muted" className="card-description">
            {t('importExport.exportDescription')}
          </Text>

          <div className="card-features">
            <Text variant="small">{t('importExport.exportFeatures1')}</Text>
            <Text variant="small">{t('importExport.exportFeatures2')}</Text>
            <Text variant="small">{t('importExport.exportFeatures3')}</Text>
            <Text variant="small">{t('importExport.exportFeatures4')}</Text>
          </div>

          <div className="card-actions">
            <Button variant="primary" onClick={onExport}>
              {t('importExport.exportBackup')}
            </Button>
          </div>
        </div>

        {/* Import Data Card */}
        <div className="card">
          <div className="card-title">
            <Heading level={3}>{t('importExport.importData')}</Heading>
          </div>
          <Text variant="muted" className="card-description">
            {t('importExport.importDescription')}
          </Text>

          <div className="card-features">
            <Text variant="small">{t('importExport.importFeatures1')}</Text>
            <Text variant="small">{t('importExport.importFeatures2')}</Text>
            <Text variant="small">{t('importExport.importFeatures3')}</Text>
            <Text variant="small">{t('importExport.importFeatures4')}</Text>
          </div>

          <div className="card-actions">
            <Button onClick={onImport}>{t('importExport.importBackup')}</Button>
          </div>
        </div>

        {/* Migrate to Supabase Card */}
        <div className="card">
          <div className="card-title">
            <Heading level={3}>Migrate to Supabase</Heading>
          </div>
          <Text variant="muted" className="card-description">
            One-time migration: import a backup JSON file into Supabase. New UUIDs are generated for
            every record and all references are remapped.
          </Text>

          <div className="card-features">
            <Text variant="small">Products, purchases, sales, transactions, cash withdrawals</Text>
            <Text variant="small">Branches and settings</Text>
            <Text variant="small">Existing Supabase data is preserved (additive insert)</Text>
            <Text variant="small" className="warning-text">
              Running this multiple times will create duplicate records
            </Text>
          </div>

          <div className="card-actions">
            <Button variant="primary" onClick={handleMigrateToSupabase} disabled={migrationRunning}>
              {migrationRunning ? 'Migrating...' : 'Migrate to Supabase'}
            </Button>
          </div>

          {migrationProgress.length > 0 && (
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              {migrationProgress.map(p => (
                <div key={p.entity} style={{ display: 'flex', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: '3rem',
                      fontWeight: 'bold',
                      color:
                        p.status === 'error'
                          ? '#ef4444'
                          : p.status === 'done'
                            ? '#22c55e'
                            : undefined,
                    }}
                  >
                    [{STATUS_ICON[p.status]}]
                  </span>
                  <span style={{ width: '12rem' }}>{p.entity}</span>
                  {p.count !== undefined && <span>{p.count} rows</span>}
                  {p.error && <span style={{ color: '#ef4444' }}>{p.error}</span>}
                </div>
              ))}
            </div>
          )}

          {migrationResult && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                background: migrationResult.success ? '#dcfce7' : '#fef2f2',
                color: migrationResult.success ? '#166534' : '#991b1b',
                fontSize: '0.875rem',
              }}
            >
              {migrationResult.success
                ? 'Migration completed successfully!'
                : `Migration finished with ${migrationResult.errors.length} error(s): ${migrationResult.errors.join('; ')}`}
            </div>
          )}
        </div>

        {/* Clear Data Card */}
        <div className="card danger-card">
          <div className="card-title">
            <Heading level={3}>{t('importExport.clearData')}</Heading>
          </div>
          <Text variant="muted" className="card-description">
            {t('importExport.clearDescription')}
          </Text>

          <div className="card-features">
            <Text variant="small" className="warning-text">
              {t('importExport.clearWarning1')}
            </Text>
            <Text variant="small" className="warning-text">
              {t('importExport.clearWarning2')}
            </Text>
            <Text variant="small" className="warning-text">
              {t('importExport.clearWarning3')}
            </Text>
            <Text variant="small" className="warning-text">
              {t('importExport.clearWarning4')}
            </Text>
          </div>

          <div className="card-actions">
            <Button variant="danger" onClick={onClear}>
              {t('importExport.clearAllData')}
            </Button>
          </div>
        </div>

        {/* Data Info Card */}
        <div className="card info-card">
          <div className="card-title">
            <Heading level={3}>{t('importExport.dataInfo')}</Heading>
          </div>
          <Text variant="muted" className="card-description">
            {t('importExport.dataInfoDescription')}
          </Text>

          <div className="card-features">
            <Text variant="small">{t('importExport.dataInfoFeatures1')}</Text>
            <Text variant="small">{t('importExport.dataInfoFeatures2')}</Text>
            <Text variant="small">{t('importExport.dataInfoFeatures3')}</Text>
            <Text variant="small">{t('importExport.dataInfoFeatures4')}</Text>
          </div>

          <div className="card-actions">
            <Text variant="small" className="info-text">
              {t('importExport.dataInfoTip')}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
