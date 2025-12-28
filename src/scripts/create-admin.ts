import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import AdminUser from '../infrastructure/database/models/AdminUser';
import AdminWallet from '../infrastructure/database/models/AdminWallet';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/trading-dashboard';

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nalmifx.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';

    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists with email:', adminEmail);
      console.log('   Admin ID:', existingAdmin.adminId);
      console.log('   Role:', existingAdmin.role);
      
      // List all admins
      const allAdmins = await AdminUser.find().select('adminId email name role isActive');
      console.log('\n📋 All Admin Users:');
      allAdmins.forEach((admin: any) => {
        console.log(`   [${admin.adminId}] ${admin.email} - ${admin.role} (${admin.isActive ? 'Active' : 'Inactive'})`);
      });
      
      await mongoose.disconnect();
      return;
    }

    // Get next adminId
    const lastAdmin = await AdminUser.findOne().sort({ adminId: -1 }).lean();
    const nextAdminId = lastAdmin && (lastAdmin as any).adminId ? (lastAdmin as any).adminId + 1 : 1;

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = new AdminUser({
      adminId: nextAdminId,
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      name: adminName,
      role: 'super_admin',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_admins', 'manage_settings', 'view_reports'],
      isActive: true,
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('   Admin ID:', nextAdminId);
    console.log('   Role: super_admin');

    // Create admin wallet
    const existingWallet = await AdminWallet.findOne({ adminId: nextAdminId });
    if (!existingWallet) {
      const wallet = new AdminWallet({
        adminId: nextAdminId,
        balance: 0,
        currency: 'USD',
      });
      await wallet.save();
      console.log('✅ Admin wallet created');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();

