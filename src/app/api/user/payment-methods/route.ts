import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import PaymentMethod from '@/infrastructure/database/models/PaymentMethod';

// GET - Fetch active payment methods for users
export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();
    const paymentMethods = await PaymentMethod.find({ isActive: true }).sort({ type: 1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      paymentMethods,
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

