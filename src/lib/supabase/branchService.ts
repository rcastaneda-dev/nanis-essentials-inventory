import { supabase } from './client';
import { Branch } from '../../types/models';
import { toBranch, toSupabaseBranch, BranchRow } from './mappers';
import { isValidUUID } from '../utils';

export async function fetchAllBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch branches: ${error.message}`);
  return (data as BranchRow[]).map(toBranch);
}

export async function upsertBranch(branch: Branch): Promise<string> {
  const row = toSupabaseBranch(branch);
  const isNew = !isValidUUID(branch.id);

  if (isNew) {
    const { id: _, ...insertPayload } = row;
    const { data, error } = await supabase
      .from('branches')
      .insert(insertPayload)
      .select('id')
      .single();
    if (error) throw new Error(`Failed to create branch: ${error.message}`);
    return data.id as string;
  }

  const { error } = await supabase.from('branches').update(row).eq('id', branch.id);
  if (error) throw new Error(`Failed to update branch: ${error.message}`);
  return branch.id;
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete branch: ${error.message}`);
}
