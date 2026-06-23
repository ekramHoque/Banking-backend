const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');
// const emailService = require('../services/email.service');
const accountModel = require('../models/account.model');
const mongoose = require('mongoose');

async function createTransactionController(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    // 1. Validate request body
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: 'Missing required fields for transaction',
            status: 'failed'
        });
    }

    try {
        const fromUserAccount = await accountModel.findById(fromAccount);
        const toUserAccount = await accountModel.findById(toAccount);

        if (!fromUserAccount || !toUserAccount) {
            return res.status(404).json({
                message: 'One or both accounts not found',
                status: 'failed'
            });
        }

        // 2. Check Idempotency Key
        const isTransactionExist = await transactionModel.findOne({ idempotencyKey });
        if (isTransactionExist) {
            const statusMessages = {
                'COMPLETED': 'Transaction already completed',
                'PENDING': 'Transaction is still pending',
                'FAILED': 'Transaction already failed',
                'REVERSED': 'Transaction already reversed'
            };
            
            return res.status(isTransactionExist.status === 'COMPLETED' || isTransactionExist.status === 'PENDING' ? 200 : 400).json({
                transaction: isTransactionExist,
                message: statusMessages[isTransactionExist.status] || 'Transaction exists',
                status: isTransactionExist.status.toLowerCase()
            });
        }

        // 3. Active account check
        if (fromUserAccount.status !== 'ACTIVE' || toUserAccount.status !== 'ACTIVE') {
            return res.status(400).json({
                message: 'One or both accounts are not active',
                status: 'failed'
            });
        }

        // 4. Derive sender balance (FIXED: formUserAccount -> fromUserAccount)
        const fromUserBalance = await fromUserAccount.getBalance();
        if (fromUserBalance < amount) {
            return res.status(400).json({
                message: `Insufficient funds in the sender account, available balance is ${fromUserBalance}`,
                status: 'failed'
            });
        }

        // --- ATOMIC TRANSACTION SESSION START ---
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 5. Create transaction in PENDING status
            const newTransaction = await transactionModel.create([{
                fromAccount,
                toAccount,
                amount,
                idempotencyKey,
                status: 'PENDING'
            }], { session });

            // 6. Create Debit entry
            await ledgerModel.create([{
                account: fromAccount,
                type: 'DEBIT',
                amount,
                transaction: newTransaction[0]._id
            }], { session });

            // 7. Create Credit entry
            await ledgerModel.create([{
                account: toAccount,
                type: 'CREDIT',
                amount,
                transaction: newTransaction[0]._id
            }], { session });

            // 8. Update status to COMPLETED
            newTransaction[0].status = 'COMPLETED';
            await newTransaction[0].save({ session });

            // 9. Commit transaction changes to MongoDB safely
            await session.commitTransaction();
            session.endSession();

            // 10. Sending email notifications (FIXED: case-sensitivity on user & spelling on amount)
            // try {
            //     await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toUserAccount._id);
            // } catch (emailErr) {
            //     console.error("Notification failed to send:", emailErr);
            // }

            return res.status(201).json({
                transaction: newTransaction[0],
                message: 'Transaction completed successfully',
                status: 'success'
            });

        } catch (transactionError) {
            // If anything inside the database atomic session fails, undo EVERYTHING automatically
            await session.abortTransaction();
            session.endSession();
            throw transactionError; // Send to outer catch block
        }

    } catch (error) {
        console.error("Create Account Error:", error);
        return res.status(500).json({
            message: 'Failed to complete transaction',
            error: error.message,
            status: 'failed'
        });
    }
}

async function createSystemTransactionController(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    // 1. Validate request body
    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: 'Missing required fields for system transaction',
            status: 'failed'
        });
    }

    try {
        const toUserAccount = await accountModel.findById(toAccount);

        if (!toUserAccount) {
            return res.status(404).json({
                message: 'Recipient account not found',
                status: 'failed'
            });
        }

        // 2. Check Idempotency Key
        const isTransactionExist = await transactionModel.findOne({ idempotencyKey });
        if (isTransactionExist) {
            const statusMessages = {
                'COMPLETED': 'Transaction already completed',
                'PENDING': 'Transaction is still pending',
                'FAILED': 'Transaction already failed',
                'REVERSED': 'Transaction already reversed'
            };
            
            return res.status(isTransactionExist.status === 'COMPLETED' || isTransactionExist.status === 'PENDING' ? 200 : 400).json({
                transaction: isTransactionExist,
                message: statusMessages[isTransactionExist.status] || 'Transaction exists',
                status: isTransactionExist.status.toLowerCase()
            });
        }

        // 3. Active account check
        if (toUserAccount.status !== 'ACTIVE') {
            return res.status(400).json({
                message: 'Recipient account is not active',
                status: 'failed'
            });
        }


        // ✅ REPLACE WITH THIS NATIVE AGGREGATION:
        const systemAccountResult = await accountModel.aggregate([
            {
                $lookup: {
                    from: "users",          // Joins with the users collection
                    localField: "user",     // Field in accountModel
                    foreignField: "_id",    // Field in userModel
                    as: "linkedUser"
                }
            },
            {
                $unwind: "$linkedUser"     // Converts the array into an object
            },
            {
                $match: {
                    "linkedUser.systemRole": true, // Filters down to only the system admin
                    "status": "ACTIVE"             // Ensures the account is active
                }
            }
        ]);

        // MongoDB Aggregation returns an array. Let's grab the first matched element.
        const fromUserAccount = systemAccountResult[0];

        if (!fromUserAccount) {
            return res.status(500).json({
                message: 'System account not found. Please verify your admin user details.',
                status: 'failed'
            });
        }

        // --- ATOMIC TRANSACTION SESSION START ---
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 4. Create system transaction in PENDING status
            const newTransaction = await transactionModel.create([{
                fromAccount: fromUserAccount._id,
                toAccount,
                amount,
                idempotencyKey,
                status: 'PENDING'
            }], { session });

            //debit entry for the system account
            await ledgerModel.create([{
                account: fromUserAccount._id,
                type: 'DEBIT',
                amount,
                transaction: newTransaction[0]._id
            }], { session });

            // 5. Create Credit entry for the recipient
            await ledgerModel.create([{
                account: toAccount,
                type: 'CREDIT',
                amount,
                transaction: newTransaction[0]._id
            }], { session });

            // 6. Update status to COMPLETED
            newTransaction[0].status = 'COMPLETED';
            await newTransaction[0].save({ session });

            // 7. Commit transaction changes to MongoDB safely
            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({
                transaction: newTransaction[0],
                message: 'System transaction completed successfully',
                status: 'success'
            });

        } catch (transactionError) {
            // If anything inside the database atomic session fails, undo EVERYTHING automatically
            await session.abortTransaction();
            session.endSession();
            throw transactionError; // Send to outer catch block
        }

    } catch (error) {
        console.error("Create System Transaction Error:", error);
        return res.status(500).json({
            message: 'Failed to complete system transaction',
            error: error.message,
            status: 'failed'
        });
    }
}

module.exports = {
    createTransactionController,
    createSystemTransactionController
};