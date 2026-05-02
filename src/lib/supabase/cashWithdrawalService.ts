import { supabase } from './client';
import { CashWithdrawal } from '../../types/models';
import { toCashWithdrawal, toSupabaseCashWithdrawal, CashWithdrawalRow } from './mappers';
import { isValidUUID } from '../utils';

export async function fetchAllCashWithdrawals(): Promise<CashWithdrawal[]> {
  const { data, error } = await supabase
    .from('cash_withdrawals')
    .select('*')
    .order('withdrawn_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch cash withdrawals: ${error.message}`);
  return (data as CashWithdrawalRow[]).map(toCashWithdrawal);
}

export async function upsertCashWithdrawal(cw: CashWithdrawal): Promise<string> {
  const row = toSupabaseCashWithdrawal(cw);
  const isNew = !isValidUUID(cw.id);

  if (isNew) {
    const { id: _, ...insertPayload } = row;
    const { data, error } = await supabase
      .from('cash_withdrawals')
      .insert(insertPayload)
      .select('id')
      .single();
    if (error) throw new Error(`Failed to save cash withdrawal: ${error.message}`);
    return data.id as string;
  }

  const { error } = await supabase.from('cash_withdrawals').update(row).eq('id', cw.id);
  if (error) throw new Error(`Failed to save cash withdrawal: ${error.message}`);
  return cw.id;
}

export async function deleteCashWithdrawal(id: string): Promise<void> {
  if (!isValidUUID(id)) return;
  const { error } = await supabase.from('cash_withdrawals').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete cash withdrawal: ${error.message}`);
}
