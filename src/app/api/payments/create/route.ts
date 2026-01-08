import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '@/lib/shared/di/container';
import { authenticateUser } from '@/lib/shared/utils/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    const paymentService = DIContainer.getPaymentService();

    const body = await request.json();
    const { analysisId, successUrl, failureUrl } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    const paymentPreference = await paymentService.createPayment({
      analysisId,
      userId: user.id,
      userEmail: user.email || '',
      successUrl,
      failureUrl,
    });

    return NextResponse.json({
      success: true,
      data: paymentPreference,
    });
  } catch (error: unknown) {
    console.error('Error creating payment:', error);
    
    const status = error instanceof Error && error.message === 'No autorizado' ? 401 : 500;
    const message = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
