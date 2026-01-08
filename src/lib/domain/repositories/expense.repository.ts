import { ExpenseAnalysis, ExpenseCategory, ExpenseStatus } from '../entities/expense';

export interface IExpenseRepository {
  // Analyses
  createAnalysis(analysis: Omit<ExpenseAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseAnalysis>;
  getAnalysisById(id: string, userId: string): Promise<ExpenseAnalysis | null>;
  getAnalysesByUserId(userId: string, limit?: number, offset?: number): Promise<ExpenseAnalysis[]>;
  updateAnalysis(id: string, userId: string, updates: Partial<ExpenseAnalysis>): Promise<ExpenseAnalysis>;
  deleteAnalysis(id: string, userId: string): Promise<void>;
  
  // Categories
  createCategories(categories: Omit<ExpenseCategory, 'id' | 'createdAt'>[]): Promise<ExpenseCategory[]>;
  updateCategory(id: string, analysisId: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory>;
  deleteCategory(id: string, analysisId: string): Promise<void>;
  getCategoriesByAnalysisId(analysisId: string): Promise<ExpenseCategory[]>;
  
  // Status updates
  updateAnalysisStatus(id: string, status: ExpenseStatus, paymentId?: string): Promise<void>;
}
