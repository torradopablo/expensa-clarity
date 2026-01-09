import { SupabaseClientFactory } from './supabase.client';
import { ExpenseAnalysis, ExpenseCategory, ExpenseStatus } from '../../domain/entities/expense';
import { IExpenseRepository } from '../../domain/repositories/expense.repository';

export class SupabaseExpenseRepository implements IExpenseRepository {
  async createAnalysis(analysis: Omit<ExpenseAnalysis, 'id' | 'createdAt' | 'updatedAt'>, accessToken?: string): Promise<ExpenseAnalysis> {
    const supabase = accessToken 
      ? SupabaseClientFactory.createClientWithAuth(accessToken)
      : SupabaseClientFactory.createClient();
    
    const { data, error } = await supabase
      .from('expense_analyses')
      .insert({
        user_id: analysis.userId,
        building_name: analysis.buildingName,
        period: analysis.period,
        unit: analysis.unit,
        total_amount: analysis.totalAmount,
        previous_total: analysis.previousTotal,
        file_url: analysis.fileUrl,
        status: analysis.status,
        payment_id: analysis.paymentId,
        notes: analysis.notes,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create analysis: ${error.message}`);
    
    return this.mapToAnalysis(data);
  }

  async getAnalysisById(id: string, userId: string, accessToken?: string): Promise<ExpenseAnalysis | null> {
    const supabase = accessToken 
      ? SupabaseClientFactory.createClientWithAuth(accessToken)
      : SupabaseClientFactory.createClient();
    
    const { data, error } = await supabase
      .from('expense_analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    
    return this.mapToAnalysis(data);
  }

  async getAnalysesByUserId(userId: string, limit = 20, offset = 0): Promise<ExpenseAnalysis[]> {
    const supabase = SupabaseClientFactory.createClient();
    
    const { data, error } = await supabase
      .from('expense_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch analyses: ${error.message}`);
    
    return data.map(this.mapToAnalysis);
  }

  async updateAnalysis(id: string, userId: string, updates: Partial<ExpenseAnalysis>, accessToken?: string): Promise<ExpenseAnalysis> {
    const supabase = accessToken 
      ? SupabaseClientFactory.createClientWithAuth(accessToken)
      : SupabaseClientFactory.createClient();
    
    const updateData: any = {};
    if (updates.buildingName !== undefined) updateData.building_name = updates.buildingName;
    if (updates.period !== undefined) updateData.period = updates.period;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount;
    if (updates.previousTotal !== undefined) updateData.previous_total = updates.previousTotal;
    if (updates.fileUrl !== undefined) updateData.file_url = updates.fileUrl;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.paymentId !== undefined) updateData.payment_id = updates.paymentId;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    console.log('Updating analysis with data:', updateData);
    console.log('Analysis ID:', id, 'User ID:', userId);

    const { data, error } = await supabase
      .from('expense_analyses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    console.log('Supabase response data:', data);
    console.log('Supabase error:', error);

    if (error) throw new Error(`Failed to update analysis: ${error.message}`);
    
    return this.mapToAnalysis(data);
  }

  async deleteAnalysis(id: string, userId: string): Promise<void> {
    const supabase = SupabaseClientFactory.createClient();
    
    const { error } = await supabase
      .from('expense_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to delete analysis: ${error.message}`);
  }

  async createCategories(categories: Omit<ExpenseCategory, 'id' | 'createdAt'>[], accessToken?: string): Promise<ExpenseCategory[]> {
    const supabase = accessToken 
      ? SupabaseClientFactory.createClientWithAuth(accessToken)
      : SupabaseClientFactory.createClient();
    
    const insertData = categories.map(cat => ({
      analysis_id: cat.analysisId,
      name: cat.name,
      icon: cat.icon,
      current_amount: cat.currentAmount,
      previous_amount: cat.previousAmount,
      status: cat.status,
      explanation: cat.explanation,
    }));

    const { data, error } = await supabase
      .from('expense_categories')
      .insert(insertData)
      .select();

    if (error) throw new Error(`Failed to create categories: ${error.message}`);
    
    return data.map(this.mapToCategory);
  }

  async updateCategory(id: string, analysisId: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const supabase = SupabaseClientFactory.createClient();
    
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.currentAmount !== undefined) updateData.current_amount = updates.currentAmount;
    if (updates.previousAmount !== undefined) updateData.previous_amount = updates.previousAmount;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.explanation !== undefined) updateData.explanation = updates.explanation;

    const { data, error } = await supabase
      .from('expense_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update category: ${error.message}`);
    
    return this.mapToCategory(data);
  }

  async deleteCategory(id: string, analysisId: string): Promise<void> {
    const supabase = SupabaseClientFactory.createClient();
    
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete category: ${error.message}`);
  }

  async getCategoriesByAnalysisId(analysisId: string, accessToken?: string): Promise<ExpenseCategory[]> {
    const supabase = accessToken 
      ? SupabaseClientFactory.createClientWithAuth(accessToken)
      : SupabaseClientFactory.createClient();
    
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
    
    return data.map(this.mapToCategory);
  }

  async updateAnalysisStatus(id: string, status: ExpenseStatus, paymentId?: string): Promise<void> {
    const supabase = SupabaseClientFactory.createServiceClient();
    
    const updateData: any = { status };
    if (paymentId) updateData.payment_id = paymentId;

    const { error } = await supabase
      .from('expense_analyses')
      .update(updateData)
      .eq('id', id);

    if (error) throw new Error(`Failed to update analysis status: ${error.message}`);
  }

  private mapToAnalysis(data: any): ExpenseAnalysis {
    return {
      id: data.id,
      userId: data.user_id,
      buildingName: data.building_name,
      period: data.period,
      unit: data.unit,
      totalAmount: data.total_amount,
      previousTotal: data.previous_total,
      fileUrl: data.file_url,
      status: data.status,
      paymentId: data.payment_id,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToCategory(data: any): ExpenseCategory {
    return {
      id: data.id,
      analysisId: data.analysis_id,
      name: data.name,
      icon: data.icon,
      currentAmount: data.current_amount,
      previousAmount: data.previous_amount,
      status: data.status,
      explanation: data.explanation,
      createdAt: data.created_at,
    };
  }
}
