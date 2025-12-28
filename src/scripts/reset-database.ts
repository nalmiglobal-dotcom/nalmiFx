import { connect } from '../db/dbConfig';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import mongoose from 'mongoose';

async function resetDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await connect();

    console.log('Deleting all users (except admin)...');
    const deleteResult = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`Deleted ${deleteResult.deletedCount} users`);

    console.log('Deleting all wallets...');
    const walletResult = await Wallet.deleteMany({});
    console.log(`Deleted ${walletResult.deletedCount} wallets`);

    console.log('Deleting all accounts...');
    const accountResult = await Account.deleteMany({});
    console.log(`Deleted ${accountResult.deletedCount} accounts`);

    console.log('Deleting all transactions...');
    const transactionResult = await Transaction.deleteMany({});
    console.log(`Deleted ${transactionResult.deletedCount} transactions`);

    // Reset admin wallet to zero
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      await Wallet.findOneAndUpdate(
        { userId: adminUser.userId },
        {
          balance: 0,
          equity: 0,
          margin: 0,
          freeMargin: 0,
          marginLevel: 0,
          floatingProfit: 0,
        },
        { upsert: true }
      );
      console.log('Reset admin wallet to zero');
    }

    console.log('\n✅ Database reset complete!');
    console.log('All users (except admin) have been removed.');
    console.log('All wallets, accounts, and transactions have been cleared.');
    console.log('Admin wallet has been reset to zero.');
    
    process.exit(0);
  } catch (error: any) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();

