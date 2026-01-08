export type ExpenseStatus = 
  | 'pending'
  | 'pending_payment' 
  | 'paid'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'payment_failed';

export type CategoryStatus = 'ok' | 'attention' | 'info';

export interface ExpenseCategory {
  id?: string;
  analysisId: string;
  name: string;
  icon: string;
  currentAmount: number;
  previousAmount?: number;
  status: CategoryStatus;
  explanation?: string;
  createdAt?: Date;
}

export interface ExpenseAnalysis {
  id?: string;
  userId: string;
  buildingName?: string;
  period: string;
  unit?: string;
  totalAmount: number;
  previousTotal?: number;
  fileUrl?: string;
  status: ExpenseStatus;
  paymentId?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  categories?: ExpenseCategory[];
}

export interface PaymentPreference {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
  analysisId: string;
}

export interface AIExtractedData {
  buildingName: string;
  period: string;
  unit: string;
  totalAmount: number;
  categories: Omit<ExpenseCategory, 'analysisId' | 'createdAt'>[];
}
