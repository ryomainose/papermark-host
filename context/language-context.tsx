import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ja';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation object
const translations = {
  en: {
    'documents.title': 'All Documents',
    'documents.subtitle': 'Manage all your documents in one place.',
    'documents.addDocument': 'Add Document',
    'documents.addFolder': 'Add Folder',
    'documents.noDocuments': 'No documents found',
    'documents.uploadSuccess': 'Document uploaded successfully',
    'documents.uploadError': 'Failed to upload document',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.share': 'Share',
    'common.copy': 'Copy',
    'common.search': 'Search',
    'sharing.copyLink': 'Copy Link',
    'sharing.linkCopied': 'Link copied to clipboard',
    'sharing.shareDocument': 'Share Document',
    'sharing.embedCode': 'Embed Code',
    'navigation.dashboard': 'Dashboard',
    'navigation.documents': 'Documents',
    'navigation.links': 'Links',
    'navigation.visitors': 'Visitors',
    'navigation.datarooms': 'Data Rooms',
  },
  ja: {
    'documents.title': 'すべてのドキュメント',
    'documents.subtitle': 'すべてのドキュメントを一箇所で管理します。',
    'documents.addDocument': 'ドキュメントを追加',
    'documents.addFolder': 'フォルダを追加',
    'documents.noDocuments': 'ドキュメントが見つかりません',
    'documents.uploadSuccess': 'ドキュメントのアップロードが完了しました',
    'documents.uploadError': 'ドキュメントのアップロードに失敗しました',
    'common.loading': '読み込み中...',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.share': '共有',
    'common.copy': 'コピー',
    'common.search': '検索',
    'sharing.copyLink': 'リンクをコピー',
    'sharing.linkCopied': 'リンクをクリップボードにコピーしました',
    'sharing.shareDocument': 'ドキュメントを共有',
    'sharing.embedCode': '埋め込みコード',
    'navigation.dashboard': 'ダッシュボード',
    'navigation.documents': 'ドキュメント',
    'navigation.links': 'リンク',
    'navigation.visitors': '訪問者',
    'navigation.datarooms': 'データルーム',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Load language from localStorage
    const savedLanguage = localStorage.getItem('papermark-language') as Language;
    if (savedLanguage && ['en', 'ja'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('papermark-language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}