import { useState, useEffect } from 'react';
import { loadDB, saveDB, flushDB } from '../lib/storage';
import { DB } from '../types/models';

export function useAppData() {
  const [db, setDb] = useState<DB>(() => loadDB());

  const persist = (next: DB) => {
    setDb(next);
    saveDB(next);
  };

  const refreshData = () => {
    setDb(loadDB());
  };

  // Flush pending writes before page unload to ensure data is saved
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushDB();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushDB(); // Also flush when component unmounts
    };
  }, []);

  return {
    db,
    persist,
    refreshData,
  };
}
