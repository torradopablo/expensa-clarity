import { PaymentPreference } from '../../domain/entities/expense';

export interface MercadoPagoConfig {
  accessToken: string;
  baseUrl: string;
}

export class MercadoPagoService {
  private config: MercadoPagoConfig;

  constructor(config: MercadoPagoConfig) {
    this.config = config;
  }

  async createPaymentPreference(
    analysisId: string,
    userEmail: string,
    successUrl?: string,
    failureUrl?: string
  ): Promise<PaymentPreference> {
    const preference = {
      items: [
        {
          id: analysisId,
          title: 'Análisis de Expensa - ExpensaCheck',
          description: 'Análisis completo de tu liquidación de expensas con detección de anomalías',
          quantity: 1,
          unit_price: 500,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/analizar?payment=success&analysisId=${analysisId}`,
        failure: failureUrl || `${process.env.NEXT_PUBLIC_APP_URL}/analizar?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/analizar?payment=pending&analysisId=${analysisId}`,
      },
      auto_return: 'approved',
      external_reference: analysisId,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
      statement_descriptor: 'EXPENSACHECK',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    console.log('Creating MP preference:', JSON.stringify(preference));

    const response = await fetch(`${this.config.baseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mercado Pago error:', response.status, errorText);
      throw new Error('Error al crear el pago en Mercado Pago');
    }

    const data = await response.json();
    console.log('MP preference created:', data.id);

    return {
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      analysisId,
    };
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching payment:', errorText);
      throw new Error('Error fetching payment details');
    }

    return response.json();
  }

  async getMerchantOrder(orderId: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/merchant_orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching merchant order:', errorText);
      throw new Error('Error fetching merchant order');
    }

    return response.json();
  }

  mapMercadoPagoStatusToExpenseStatus(mpStatus: string): string {
    switch (mpStatus) {
      case 'approved':
        return 'paid';
      case 'pending':
      case 'in_process':
        return 'pending_payment';
      case 'rejected':
      case 'cancelled':
        return 'payment_failed';
      default:
        return 'pending_payment';
    }
  }
}
