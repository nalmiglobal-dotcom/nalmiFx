import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import AccountType from '@/infrastructure/database/models/AccountType';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connect();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const query: any = { isActive: true };
    if (type) {
      query.type = type;
    }

    const accountTypes = await AccountType.find(query)
      .select('_id name type description minDeposit maxLeverage spread commission features')
      .sort({ minDeposit: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      accountTypes,
    });
  } catch (error: any) {
    console.error('Failed to fetch account types:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch account types' },
      { status: 500 }
    );
  }
}
