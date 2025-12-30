import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      onClick={toggleLanguage}
      className="language-switcher"
      title={t('language.switch')}
      data-testid="language-switcher"
    >
      {i18n.language === 'es' ? '🇪🇸' : '🇺🇸'} {i18n.language === 'es' ? 'ES' : 'EN'}
    </Button>
  );
}
