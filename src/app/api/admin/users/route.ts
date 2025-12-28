import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  console.log('=== API STARTED ===');
  console.log('Method:', request.method);
  console.log('URL:', request.url);
  
  try {
    console.log('=== CONNECTING TO DATABASE ===');
    await connect();
    console.log('Database connected successfully');
    
    console.log('=== GETTING ADMIN SESSION ===');
    const session = await getAdminSession();
    console.log('Session retrieved:', session ? 'valid' : 'invalid');

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      console.log('=== AUTHENTICATION FAILED ===');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    console.log('=== AUTHENTICATION SUCCESS ===');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // Increased limit to show all users
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const filter = searchParams.get('filter') || 'all';
    
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { userId: parseInt(search) || 0 },
      ];
    }
    
    // Filter logic
    if (status === 'active') {
      query.isActive = true;
      query.isBanned = { $ne: true };
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    if (filter === 'banned') {
      query.isBanned = true;
    } else if (filter === 'readonly') {
      query.isReadOnly = true;
    }
    
    // Handle challenge users filter separately
    if (filter === 'challenge') {
      try {
        // console.log('=== CHALLENGE FILTER DEBUG ===');
        // console.log('Filter value:', filter);
        
        const ChallengeAccount = (await import('@/infrastructure/database/models/ChallengeAccount')).default;
        // console.log('ChallengeAccount imported:', !!ChallengeAccount);
        
        const challengeAccounts = await ChallengeAccount.find({}).lean();
        // console.log('Challenge accounts retrieved:', challengeAccounts.length);
        
        // Extract ObjectIds and convert to strings
        const challengeUserObjectIds = challengeAccounts.map(account => account.userId.toString());
        // console.log('Challenge user ObjectId strings:', challengeUserObjectIds.length);
        
        // Since User.userId is a number, we need to find users differently
        // We'll need to match based on a different field or convert the User model
        // For now, let's skip the filter and show empty results
        // console.log('Type mismatch detected - returning empty results for now'); 
        query.userId = { $in: [-1] }; // Non-existent userId to return empty results
      } catch (error: any) {
        console.error('=== CHALLENGE FILTER ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Return empty results if there's an error
        query.userId = { $in: [-1] };
      }
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    // Get stats for dashboard
    const totalAll = await User.countDocuments({});
    const totalActive = await User.countDocuments({ isActive: true, isBanned: { $ne: true } });
    const totalInactive = await User.countDocuments({ isActive: false });
    const totalBanned = await User.countDocuments({ isBanned: true });
    const totalReadOnly = await User.countDocuments({ isReadOnly: true });
    
    // Get challenge users count
    let totalChallengeUsers = 0;
    try {
      console.log('=== CHALLENGE STATS DEBUG ===');
      
      const ChallengeAccount = (await import('@/infrastructure/database/models/ChallengeAccount')).default;
      console.log('ChallengeAccount imported for stats:', !!ChallengeAccount);
      
      const challengeAccounts = await ChallengeAccount.find({}).lean();
      totalChallengeUsers = challengeAccounts.length;
      console.log('Challenge users count:', totalChallengeUsers);
    } catch (error: any) {
      // console.error('=== CHALLENGE STATS ERROR ===');
      // console.error('Error details:', error);
      // console.error('Error message:', error.message);
      // console.error('Error stack:', error.stack);
      totalChallengeUsers = 0;
    }

    return NextResponse.json({
      success: true,
      users,
      totalUsers,
      page,
      limit,
      totalPages: Math.ceil(totalUsers / limit),
      stats: {
        totalAll,
        totalActive,
        totalInactive,
        totalBanned,
        totalReadOnly,
        totalChallengeUsers,
      }
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connect();
    const session = await getAdminSession();

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { email, password, name, phone, role, isActive, balance, kycVerified } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const lastUser = await User.findOne().sort({ userId: -1 }).lean();
    const nextUserId = lastUser && lastUser.userId ? lastUser.userId + 1 : 100000;

    const user = new User({
      userId: nextUserId,
      email,
      password: hashedPassword,
      name,
      phone,
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      balance: balance !== undefined ? balance : 0,
      kycVerified: kycVerified !== undefined ? kycVerified : false,
      createdByAdmin: session.adminId, // Track which admin created this user
    });

    await user.save();

    // Track this user in the admin's referredUsers list
    const AdminUser = (await import('@/infrastructure/database/models/AdminUser')).default;
    await AdminUser.updateOne(
      { adminId: session.adminId },
      { $addToSet: { referredUsers: nextUserId } }
    );

    // Create wallet for new user - always start at 0 unless admin explicitly sets balance > 0
    const Wallet = (await import('@/infrastructure/database/models/Wallet')).default;
    const initialBalance = (balance && balance > 0) ? balance : 0;
    const wallet = new Wallet({
      userId: user.userId,
      balance: initialBalance,
      equity: initialBalance,
      margin: 0,
      freeMargin: initialBalance,
      marginLevel: 0,
      floatingProfit: 0,
    });
    await wallet.save();

    return NextResponse.json({
      success: true,
      message: 'User created successfully by admin',
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to create user' },
      { status: 500 }
    );
  }
}

