import { supabase } from './client';
import { Brand } from '../../types/models';

export async function fetchAllBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, display_name')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch brands: ${error.message}`);
  }

  return (data ?? []).map(row => ({
    id: row.id as string,
    name: row.name as string,
    displayName: (row.display_name as string | null) ?? undefined,
  }));
}
