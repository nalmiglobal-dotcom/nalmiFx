import { NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Transaction from '@/infrastructure/database/models/Transaction';
import Wallet from '@/infrastructure/database/models/Wallet';
import User from '@/infrastructure/database/models/User';
import { sendEmail, getDepositApprovedEmailTemplate, getDepositRejectedEmailTemplate, getWithdrawalApprovedEmailTemplate, getWithdrawalRejectedEmailTemplate } from '@/infrastructure/services/email.service';
import mongoose from 'mongoose';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
    const session = await getSession() || await getAdminSessionFromRequest(req);
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized' },
            { status: 403 }
        );
    }

    const { id } = params;
    const { status, adminNotes } = await req.json();

    if (!['approved', 'rejected'].includes(status)) {
        return NextResponse.json(
            { success: false, message: 'Invalid status' },
            { status: 400 }
        );
    }

    await connect();

    try {
        const transaction = await Transaction.findById(id);

        if (!transaction) {
            return NextResponse.json(
                { success: false, message: 'Transaction not found' },
                { status: 404 }
            );
        }

        if (transaction.status !== 'pending') {
            return NextResponse.json(
                { success: false, message: 'Transaction has already been processed' },
                { status: 409 }
            );
        }
        
        // Important: In a non-transactional context, we should update the wallet first
        // for withdrawals to ensure we don't approve a transaction if the debit fails.
        // For deposits, it's safer to update the transaction status first.

        if (status === 'approved') {
            if (transaction.type === 'deposit') {
                // For deposits, we can mark as approved then update wallet.
                // If wallet update fails, manual correction is needed, but funds aren't lost.
            } else { // withdrawal
                const wallet = await Wallet.findOne({ userId: transaction.userId });
                if (!wallet || wallet.balance < transaction.amount) {
                    return NextResponse.json(
                        { success: false, message: 'Insufficient wallet balance to approve withdrawal.' },
                        { status: 400 }
                    );
                }
                // Debit wallet first
                wallet.balance -= transaction.amount;
                await wallet.save();
            }
        }

        transaction.status = status;
        transaction.processedAt = new Date();
        transaction.processedBy = session.userId;
        if (adminNotes) {
            transaction.adminNotes = adminNotes;
        }
        await transaction.save();

        // If it was a deposit that was approved, now credit the wallet
        if (transaction.type === 'deposit' && status === 'approved') {
            await Wallet.findOneAndUpdate(
                { userId: transaction.userId },
                { $inc: { balance: transaction.amount } },
                { upsert: true, new: true }
            );
        }

        // Send email notification to user
        try {
            const user = await User.findOne({ userId: transaction.userId });
            if (user && user.email) {
                let emailHtml: string;
                let subject: string;
                
                if (transaction.type === 'deposit') {
                    if (status === 'approved') {
                        emailHtml = getDepositApprovedEmailTemplate(user.name || 'User', transaction.amount, transaction.method || 'bank');
                        subject = 'Your Deposit Has Been Approved - NalmiFX';
                    } else {
                        emailHtml = getDepositRejectedEmailTemplate(user.name || 'User', transaction.amount, adminNotes || '');
                        subject = 'Your Deposit Has Been Rejected - NalmiFX';
                    }
                } else {
                    if (status === 'approved') {
                        emailHtml = getWithdrawalApprovedEmailTemplate(user.name || 'User', transaction.amount, transaction.method || 'bank');
                        subject = 'Your Withdrawal Has Been Approved - NalmiFX';
                    } else {
                        emailHtml = getWithdrawalRejectedEmailTemplate(user.name || 'User', transaction.amount, adminNotes || '');
                        subject = 'Your Withdrawal Has Been Rejected - NalmiFX';
                    }
                }
                
                await sendEmail({ to: user.email, subject, html: emailHtml });
                console.log(`[Funds] ${transaction.type} ${status} email sent to ${user.email}`);
            }
        } catch (emailError) {
            console.error('[Funds] Failed to send email:', emailError);
        }

        return NextResponse.json({
            success: true,
            message: `Transaction ${status}`,
            transaction,
        });

    } catch (error: any) {
        console.error('Failed to update transaction:', error);
        // Note: At this point, the operations are not atomic.
        // If an error occurred, the data might be in an inconsistent state.
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to update transaction' },
            { status: 500 }
        );
    }
}
