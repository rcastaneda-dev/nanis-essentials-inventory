import React from 'react';
import { NavigationBar, Tab } from '../organisms/NavigationBar';
import { LanguageSwitcher } from '../atoms/LanguageSwitcher';

interface MainLayoutTemplateProps {
  // Navigation
  brandTitle: string;
  activeTab: Tab;
  onTabChange: (_tab: Tab) => void;

  // Page Content
  children: React.ReactNode;
}

export function MainLayoutTemplate({
  brandTitle,
  activeTab,
  onTabChange,
  children,
}: MainLayoutTemplateProps) {
  return (
    <div className="app">
      <NavigationBar brandTitle={brandTitle} activeTab={activeTab} onTabChange={onTabChange} />
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000 }}>
        <LanguageSwitcher />
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}
