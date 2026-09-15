// src/types/database.ts
export type UserRole = "owner" | "employee";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  mobile_number: string;
  address: string;
  opening_balance: number;
  opening_balance_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type JobStatus = "new" | "in_process" | "completed";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface ClientProduct {
  id: string;
  client_id: string;
  name: string;
  job_details: string | null;
  paper_qty: number;
  colors_qty: number;
  print_qty: number;
  rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PrintJob {
  id: string;
  job_date: string;
  client_id: string;
  job_details: string;
  paper_qty: number;
  colors_qty: number;
  print_qty: number;
  rate: number;
  total_amount: number;
  status: JobStatus;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Payment {
  id: string;
  client_id: string;
  job_id?: string;
  amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface Expense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  created_at: string;
  created_by: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  created_at: string;
}
