import { NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import IBWithdrawal from '@/infrastructure/database/models/IBWithdrawal';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    let session = await getSession();
    if (!session) {
      session = await getAdminSessionFromRequest(req);
    }
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();

    const { id } = params;
    const { status } = await req.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status provided.' },
        { status: 400 }
      );
    }

    const withdrawal = await IBWithdrawal.findById(id);

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, message: 'Withdrawal request not found.' },
        { status: 404 }
      );
    }
    
    if (withdrawal.status !== 'pending') {
        return NextResponse.json(
            { success: false, message: 'This request has already been processed.' },
            { status: 409 }
        );
    }

    withdrawal.status = status;
    withdrawal.processedAt = new Date();

    // In a real application, you would also trigger the actual payment
    // and deduct the amount from the IB's commission balance here.
    
    await withdrawal.save();

    return NextResponse.json({
      success: true,
      message: `Withdrawal request has been ${status}.`,
      withdrawal,
    });
  } catch (error: any) {
    console.error(`Failed to update withdrawal ${params.id}:`, error);
    return NextResponse.json(
      { success: false, message: 'Failed to update withdrawal request' },
      { status: 500 }
    );
  }
}
