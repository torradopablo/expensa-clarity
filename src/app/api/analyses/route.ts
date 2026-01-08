import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '@/lib/shared/di/container';
import { authenticateUser } from '@/lib/shared/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    const expenseService = DIContainer.getExpenseService();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const analyses = await expenseService.getAnalysesByUserId(user.id, limit, offset);

    return NextResponse.json({
      success: true,
      data: analyses,
    });
  } catch (error: unknown) {
    console.error('Error fetching analyses:', error);
    
    const status = error instanceof Error && error.message === 'No autorizado' ? 401 : 500;
    const message = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    const expenseService = DIContainer.getExpenseService();

    const body = await request.json();
    const { period, unit, notes } = body;

    if (!period) {
      return NextResponse.json(
        { error: 'Period is required' },
        { status: 400 }
      );
    }

    const analysis = await expenseService.createAnalysis({
      userId: user.id,
      period,
      unit,
      notes,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: unknown) {
    console.error('Error creating analysis:', error);
    
    const status = error instanceof Error && error.message === 'No autorizado' ? 401 : 500;
    const message = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
