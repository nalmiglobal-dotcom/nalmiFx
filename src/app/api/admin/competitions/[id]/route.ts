import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Competition from '@/infrastructure/database/models/Competition';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connect();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: 'Invalid competition ID' }, { status: 400 });
    }

    const competition = await Competition.findById(params.id).lean();

    if (!competition) {
      return NextResponse.json({ success: false, message: 'Competition not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      competition,
    });
  } catch (error: any) {
    console.error('Error fetching competition:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch competition' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connect();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: 'Invalid competition ID' }, { status: 400 });
    }

    const body = await req.json();
    const competition = await Competition.findById(params.id);

    if (!competition) {
      return NextResponse.json({ success: false, message: 'Competition not found' }, { status: 404 });
    }

    // Update fields
    if (body.name !== undefined) competition.name = body.name;
    if (body.description !== undefined) competition.description = body.description;
    if (body.type !== undefined) competition.type = body.type;
    if (body.startDate !== undefined) competition.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) competition.endDate = new Date(body.endDate);
    if (body.entryFee !== undefined) competition.entryFee = body.entryFee;
    if (body.prizePool !== undefined) competition.prizePool = body.prizePool;
    if (body.maxParticipants !== undefined) competition.maxParticipants = body.maxParticipants;
    if (body.rules !== undefined) competition.rules = body.rules;

    // Recalculate status based on dates
    const now = new Date();
    if (competition.endDate < now) {
      competition.status = 'ended';
    } else if (competition.startDate <= now && competition.endDate >= now) {
      competition.status = 'ongoing';
    } else if (competition.startDate > now) {
      competition.status = 'upcoming';
    }

    await competition.save();

    return NextResponse.json({
      success: true,
      competition,
      message: 'Competition updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating competition:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update competition' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connect();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: 'Invalid competition ID' }, { status: 400 });
    }

    const competition = await Competition.findByIdAndDelete(params.id);

    if (!competition) {
      return NextResponse.json({ success: false, message: 'Competition not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Competition deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting competition:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete competition' },
      { status: 500 }
    );
  }
}

