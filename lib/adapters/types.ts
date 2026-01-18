// lib/adapters/types.ts

// 1. Raw Input (From Adapters)
export interface NormalizedTransaction {
  date: string; // ISO "YYYY-MM-DD"
  amount: number; // Negative = Expense
  description: string;
  currency: string; // "EUR", "BRL"
  category: string; // Bank's raw category
}

// 2. Database Row (From Supabase)
export interface Transaction {
  id: string;
  created_at: string;
  date: string;
  description: string;
  amount: number; // Original amount
  amount_eur: number; // Normalized amount (New Column)
  original_currency: string;
  category: string; // Cleaned/Smart Category
  account_id: string;
  is_manual: boolean;
}

// Adapter Signature
export type AdapterFunction = (file: File) => Promise<NormalizedTransaction[]>;
