import { supabase } from './client';
import { CashWithdrawal } from '../../types/models';
import { toCashWithdrawal, toSupabaseCashWithdrawal, CashWithdrawalRow } from './mappers';

export async function fetchAllCashWithdrawals(): Promise<CashWithdrawal[]> {
  const { data, error } = await supabase
    .from('cash_withdrawals')
    .select('*')
    .order('withdrawn_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch cash withdrawals: ${error.message}`);
  return (data as CashWithdrawalRow[]).map(toCashWithdrawal);
}

export async function upsertCashWithdrawal(cw: CashWithdrawal): Promise<void> {
  const row = toSupabaseCashWithdrawal(cw);
  const { error } = await supabase.from('cash_withdrawals').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`Failed to save cash withdrawal: ${error.message}`);
}
