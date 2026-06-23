const accountModel = require('../models/account.model');

async function createAccountController(req, res) {
    const userId = req.user._id;

    try {
        const newAccount = await accountModel.create({
            user: userId,
            status: "ACTIVE",
            currency: "BDT"
        });

        return res.status(201).json({
            account: newAccount,
            message: 'Account created successfully',
            status: 'success'
        });
    } catch (error) {
        console.error("Create Account Error:", error);
        return res.status(500).json({
            message: 'Failed to create account',
            status: 'failed'
        });
    }
}

async function getAllAccountsController(req, res) {
    const userId = req.user._id;

    try {
        const accounts = await accountModel.find({ user: userId }).sort({ createdAt: -1 });

        return res.status(200).json({
            accounts,
            message: 'Accounts retrieved successfully',
            status: 'success'
        });
    } catch (error) {
        console.error("Get Accounts Error:", error);
        return res.status(500).json({
            message: 'Failed to retrieve accounts',
            status: 'failed'
        });
    }
}

async function getSingleAccountBalanceController(req, res) {
    // 1. Get the accountId from URL parameters (e.g., /accounts/:accountId/balance)
    const { accountId } = req.params; 
    const userId = req.user._id;

    try {
        // 2. Find the specific account by its unique _id
        const account = await accountModel.findById(accountId);

        if (!account) {
            return res.status(404).json({
                message: 'Account not found',
                status: 'failed'
            });
        }

        // 3. 🚨 SECURITY CHECK: Ensure the logged-in user actually owns this account
        if (account.user.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'Forbidden: You do not own this account',
                status: 'failed'
            });
        }

        // 4. Calculate the balance using your optimized aggregate method
        const balance = await account.getBalance();

        // 5. Return the clean result
        return res.status(200).json({
            accountId: account._id,
            currency: account.currency,
            status: account.status,
            balance,
            message: 'Account balance retrieved successfully',
            status: 'success'
        });

    } catch (error) {
        console.error("Get Single Account Balance Error:", error);
        return res.status(500).json({
            message: 'Failed to retrieve account balance',
            error: error.message,
            status: 'failed'
        });
    }
}


module.exports = {
    createAccountController,
    getAllAccountsController,
    getSingleAccountBalanceController
};