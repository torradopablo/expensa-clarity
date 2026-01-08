import { ExpenseAnalysis, ExpenseStatus } from '../entities/expense';
import { IExpenseRepository } from '../repositories/expense.repository';
import { MercadoPagoService } from '../../infrastructure/payments/mercado-pago.service';

export interface CreatePaymentRequest {
  analysisId: string;
  userId: string;
  userEmail: string;
  successUrl?: string;
  failureUrl?: string;
}

export class PaymentService {
  constructor(
    private expenseRepository: IExpenseRepository,
    private mercadoPagoService: MercadoPagoService
  ) {}

  async createPayment(request: CreatePaymentRequest) {
    // Verify the analysis belongs to the user
    const analysis = await this.expenseRepository.getAnalysisById(
      request.analysisId,
      request.userId
    );

    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // Create Mercado Pago preference
    const paymentPreference = await this.mercadoPagoService.createPaymentPreference(
      request.analysisId,
      request.userEmail,
      request.successUrl,
      request.failureUrl
    );

    // Update analysis status and payment ID
    await this.expenseRepository.updateAnalysisStatus(
      request.analysisId,
      'pending_payment',
      paymentPreference.preferenceId
    );

    return paymentPreference;
  }

  async handleWebhook(notificationType: string, resourceId: string) {
    if (notificationType === 'payment' || notificationType === 'payment.created' || notificationType === 'payment.updated') {
      // Fetch payment details from Mercado Pago
      const payment = await this.mercadoPagoService.getPaymentDetails(resourceId);
      
      const analysisId = payment.external_reference;
      if (!analysisId) {
        console.log('No external_reference found in payment');
        return { success: true, message: 'No analysis ID found' };
      }

      // Map Mercado Pago status to our status
      const newStatus = this.mercadoPagoService.mapMercadoPagoStatusToExpenseStatus(
        payment.status
      ) as ExpenseStatus;

      // Update analysis status
      await this.expenseRepository.updateAnalysisStatus(
        analysisId,
        newStatus,
        payment.id.toString()
      );

      console.log(`Analysis ${analysisId} updated to status: ${newStatus}`);

      return { success: true, status: newStatus };
    }

    // Handle merchant_order notifications if needed
    if (notificationType === 'merchant_order') {
      const order = await this.mercadoPagoService.getMerchantOrder(resourceId);
      
      // Check if order is fully paid
      if (order.status === 'closed' && order.external_reference) {
        await this.expenseRepository.updateAnalysisStatus(
          order.external_reference,
          'paid'
        );
      }
    }

    return { success: true, message: 'Webhook processed' };
  }
}
