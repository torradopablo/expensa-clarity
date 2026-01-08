import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '@/lib/shared/di/container';

export async function POST(request: NextRequest) {
  try {
    const paymentService = DIContainer.getPaymentService();

    // Mercado Pago sends notifications as query params for IPN
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    // Also check body for webhook notifications
    let body: any = {};
    if (request.method === 'POST') {
      try {
        body = await request.json();
      } catch {
        // Body might be empty for some webhook types
      }
    }

    const notificationType = topic || body.type || body.action;
    const resourceId = id || body.data?.id;

    console.log('Webhook received:', { notificationType, resourceId, body });

    if (!notificationType || !resourceId) {
      return NextResponse.json(
        { message: 'Notification received but no action needed' },
        { status: 200 }
      );
    }

    const result = await paymentService.handleWebhook(notificationType, resourceId);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { message: 'Mercado Pago webhook endpoint' },
    { status: 200 }
  );
}
