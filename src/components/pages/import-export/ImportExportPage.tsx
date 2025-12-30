import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button';
import { PageHeader } from '../../molecules/PageHeader';
import { Heading, Text } from '../../atoms/Typography';

interface ImportExportPageProps {
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

export function ImportExportPage({ onExport, onImport, onClear }: ImportExportPageProps) {
  const { t } = useTranslation();
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
