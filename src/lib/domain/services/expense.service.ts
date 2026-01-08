import { ExpenseAnalysis, ExpenseCategory, ExpenseStatus, AIExtractedData } from '../entities/expense';
import { IExpenseRepository } from '../repositories/expense.repository';
import { AIService } from '../../infrastructure/ai/ai.service';
import { OpenAIProvider } from '../../infrastructure/ai/providers/openai.provider';
import { OpenRouterProvider } from '../../infrastructure/ai/providers/openrouter.provider';

export interface CreateAnalysisRequest {
  userId: string;
  period: string;
  unit?: string;
  notes?: string;
  accessToken?: string;
}

export interface ProcessExpenseRequest {
  analysisId: string;
  userId: string;
  imageBase64: string;
  mimeType: string;
  accessToken?: string;
}

export class ExpenseService {
  constructor(
    private expenseRepository: IExpenseRepository,
    private aiService: AIService
  ) {
    this.initializeAIProviders();
  }

  private initializeAIProviders() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const primaryProvider = process.env.AI_PROVIDER || 'openai';

    // Add primary provider first
    if (primaryProvider === 'openai' && openaiKey) {
      this.aiService.addProvider(new OpenAIProvider(openaiKey));
    } else if (primaryProvider === 'openrouter' && openrouterKey) {
      this.aiService.addProvider(new OpenRouterProvider(openrouterKey));
    }

    // Add fallback providers
    if (primaryProvider !== 'openai' && openaiKey) {
      this.aiService.addProvider(new OpenAIProvider(openaiKey));
    }
    if (primaryProvider !== 'openrouter' && openrouterKey) {
      this.aiService.addProvider(new OpenRouterProvider(openrouterKey));
    }
  }

  async createAnalysis(request: CreateAnalysisRequest): Promise<ExpenseAnalysis> {
    return await this.expenseRepository.createAnalysis({
      userId: request.userId,
      period: request.period,
      unit: request.unit,
      totalAmount: 0, // Will be updated after AI processing
      status: 'pending',
      notes: request.notes,
    }, request.accessToken);
  }

  async processExpense(request: ProcessExpenseRequest): Promise<ExpenseAnalysis> {
    // Update status to processing
    await this.expenseRepository.updateAnalysisStatus(request.analysisId, 'processing');

    try {
      // Extract data using AI
      const extractedData = await this.aiService.extractExpenseData(
        request.imageBase64,
        request.mimeType
      );

      // Update analysis with extracted data
      const updatedAnalysis = await this.expenseRepository.updateAnalysis(
        request.analysisId,
        request.userId,
        {
          buildingName: extractedData.buildingName,
          period: extractedData.period,
          unit: extractedData.unit,
          totalAmount: extractedData.totalAmount,
          status: 'completed',
        },
        request.accessToken
      );

      // Create categories
      if (extractedData.categories.length > 0) {
        const categories = extractedData.categories.map(cat => ({
          analysisId: request.analysisId,
          ...cat,
        }));
        
        await this.expenseRepository.createCategories(categories, request.accessToken);
      }

      // Fetch complete analysis with categories
      return await this.getAnalysisById(request.analysisId, request.userId, request.accessToken);
    } catch (error) {
      // Update status to failed
      await this.expenseRepository.updateAnalysisStatus(request.analysisId, 'failed');
      throw error;
    }
  }

  async getAnalysisById(id: string, userId: string, accessToken?: string): Promise<ExpenseAnalysis> {
    const analysis = await this.expenseRepository.getAnalysisById(id, userId, accessToken);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // Fetch categories
    const categories = await this.expenseRepository.getCategoriesByAnalysisId(id, accessToken);
    analysis.categories = categories;

    return analysis;
  }

  async getAnalysesByUserId(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<ExpenseAnalysis[]> {
    const analyses = await this.expenseRepository.getAnalysesByUserId(userId, limit, offset);
    
    // Fetch categories for each analysis
    for (const analysis of analyses) {
      if (analysis.id) {
        analysis.categories = await this.expenseRepository.getCategoriesByAnalysisId(analysis.id);
      }
    }

    return analyses;
  }

  async updateAnalysis(
    id: string,
    userId: string,
    updates: Partial<ExpenseAnalysis>
  ): Promise<ExpenseAnalysis> {
    return await this.expenseRepository.updateAnalysis(id, userId, updates);
  }

  async deleteAnalysis(id: string, userId: string): Promise<void> {
    await this.expenseRepository.deleteAnalysis(id, userId);
  }

  async updateAnalysisStatus(
    id: string,
    status: ExpenseStatus,
    paymentId?: string
  ): Promise<void> {
    await this.expenseRepository.updateAnalysisStatus(id, status, paymentId);
  }
}
