import { ExpenseService } from '../../domain/services/expense.service';
import { PaymentService } from '../../domain/services/payment.service';
import { SupabaseExpenseRepository } from '../../infrastructure/database/expense.repository.impl';
import { AIService } from '../../infrastructure/ai/ai.service';
import { MercadoPagoService } from '../../infrastructure/payments/mercado-pago.service';

export class DIContainer {
  private static expenseRepository: SupabaseExpenseRepository;
  private static aiService: AIService;
  private static mercadoPagoService: MercadoPagoService;
  private static expenseService: ExpenseService;
  private static paymentService: PaymentService;

  static getExpenseRepository(): SupabaseExpenseRepository {
    if (!this.expenseRepository) {
      this.expenseRepository = new SupabaseExpenseRepository();
    }
    return this.expenseRepository;
  }

  static getAIService(): AIService {
    if (!this.aiService) {
      this.aiService = new AIService();
    }
    return this.aiService;
  }

  static getMercadoPagoService(): MercadoPagoService {
    if (!this.mercadoPagoService) {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
      }
      
      const baseUrl = process.env.MERCADOPAGO_ENV === 'production' 
        ? 'https://api.mercadopago.com'
        : 'https://api.mercadopago.com'; // Use sandbox URL if available

      this.mercadoPagoService = new MercadoPagoService({
        accessToken,
        baseUrl,
      });
    }
    return this.mercadoPagoService;
  }

  static getExpenseService(): ExpenseService {
    if (!this.expenseService) {
      this.expenseService = new ExpenseService(
        this.getExpenseRepository(),
        this.getAIService()
      );
    }
    return this.expenseService;
  }

  static getPaymentService(): PaymentService {
    if (!this.paymentService) {
      this.paymentService = new PaymentService(
        this.getExpenseRepository(),
        this.getMercadoPagoService()
      );
    }
    return this.paymentService;
  }
}
