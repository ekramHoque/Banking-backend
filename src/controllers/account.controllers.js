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

module.exports = {
    createAccountController
};