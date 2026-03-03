import { supabase } from './client';
import { Transaction } from '../../types/models';
import { toTransaction, toSupabaseTransaction, TransactionRow } from './mappers';

export async function fetchAllTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
  return (data as TransactionRow[]).map(toTransaction);
}

export async function upsertTransaction(tx: Transaction): Promise<void> {
  const row = toSupabaseTransaction(tx);
  const { error } = await supabase.from('transactions').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`Failed to save transaction: ${error.message}`);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete transaction: ${error.message}`);
}
