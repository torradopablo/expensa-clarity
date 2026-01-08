import { ExpenseAnalysis, ExpenseCategory, ExpenseStatus } from '../entities/expense';

export interface IExpenseRepository {
  // Analyses
  createAnalysis(analysis: Omit<ExpenseAnalysis, 'id' | 'createdAt' | 'updatedAt'>, accessToken?: string): Promise<ExpenseAnalysis>;
  getAnalysisById(id: string, userId: string, accessToken?: string): Promise<ExpenseAnalysis | null>;
  getAnalysesByUserId(userId: string, limit?: number, offset?: number, accessToken?: string): Promise<ExpenseAnalysis[]>;
  updateAnalysis(id: string, userId: string, updates: Partial<ExpenseAnalysis>, accessToken?: string): Promise<ExpenseAnalysis>;
  deleteAnalysis(id: string, userId: string, accessToken?: string): Promise<void>;
  
  // Categories
  createCategories(categories: Omit<ExpenseCategory, 'id' | 'createdAt'>[], accessToken?: string): Promise<ExpenseCategory[]>;
  updateCategory(id: string, analysisId: string, updates: Partial<ExpenseCategory>, accessToken?: string): Promise<ExpenseCategory>;
  deleteCategory(id: string, analysisId: string, accessToken?: string): Promise<void>;
  getCategoriesByAnalysisId(analysisId: string, accessToken?: string): Promise<ExpenseCategory[]>;
  
  // Status updates
  updateAnalysisStatus(id: string, status: ExpenseStatus, paymentId?: string): Promise<void>;
}
