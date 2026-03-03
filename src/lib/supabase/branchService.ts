import { supabase } from './client';
import { Branch } from '../../types/models';
import { toBranch, toSupabaseBranch, BranchRow } from './mappers';

export async function fetchAllBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch branches: ${error.message}`);
  return (data as BranchRow[]).map(toBranch);
}

export async function upsertBranch(branch: Branch): Promise<void> {
  const row = toSupabaseBranch(branch);
  const { error } = await supabase.from('branches').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`Failed to save branch: ${error.message}`);
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete branch: ${error.message}`);
}
