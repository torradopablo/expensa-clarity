import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '@/lib/shared/di/container';
import { authenticateUser } from '@/lib/shared/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateUser(request);
    const expenseService = DIContainer.getExpenseService();

    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'Image data and mimeType are required' },
        { status: 400 }
      );
    }

    const analysis = await expenseService.processExpense({
      analysisId: params.id,
      userId: user.id,
      imageBase64,
      mimeType,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: unknown) {
    console.error('Error processing expense:', error);
    
    const status = error instanceof Error && error.message === 'No autorizado' ? 401 : 500;
    const message = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
