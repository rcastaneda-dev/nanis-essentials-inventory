import { supabase } from './client';
import { Settings, DEFAULT_SETTINGS } from '../../types/models';
import { toSettings, toSupabaseSettings, SettingsRow } from './mappers';

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').limit(1).single();

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to fetch settings, using defaults:', error.message);
    return { ...DEFAULT_SETTINGS };
  }

  return toSettings(data as SettingsRow);
}

export async function updateSettings(settings: Settings): Promise<void> {
  const row = toSupabaseSettings(settings);
  const { error } = await supabase.from('settings').update(row).not('id', 'is', null);
  if (error) throw new Error(`Failed to update settings: ${error.message}`);
}
