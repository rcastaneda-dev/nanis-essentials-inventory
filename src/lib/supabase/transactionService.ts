import { supabase } from './client';
import { Transaction } from '../../types/models';
import { toTransaction, toSupabaseTransaction, TransactionRow } from './mappers';
import { isValidUUID } from '../utils';

export async function fetchAllTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
  return (data as TransactionRow[]).map(toTransaction);
}

export async function upsertTransaction(tx: Transaction): Promise<string> {
  const row = toSupabaseTransaction(tx);
  const isNew = !isValidUUID(tx.id);

  if (isNew) {
    const { id: _, ...insertPayload } = row;
    const { data, error } = await supabase
      .from('transactions')
      .insert(insertPayload)
      .select('id')
      .single();
    if (error) throw new Error(`Failed to save transaction: ${error.message}`);
    return data.id as string;
  }

  const { error } = await supabase.from('transactions').update(row).eq('id', tx.id);
  if (error) throw new Error(`Failed to save transaction: ${error.message}`);
  return tx.id;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete transaction: ${error.message}`);
}
