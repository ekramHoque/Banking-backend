const mongoose = require('mongoose');
const ledgerModel = require('./ledger.model');
const { captureRejectionSymbol } = require('nodemailer/lib/xoauth2');

const accountSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        index: true
    },
    status:{
        type: String,
        enum:{
            values:["ACTIVE","DORMANT","CLOSED"],
            message: 'Status must be either ACTIVE, DORMANT, or CLOSED',
        },
        default: "ACTIVE"
    },
    currency:{
        type: String,
        required: [true, 'Currency is required'],
        uppercase: true,
        default: 'BDT'
    }
},{
    timestamps: true
});

accountSchema.index({ user: 1 , status: 1});

accountSchema.methods.getBalance = async function() {

    const result = await ledgerModel.aggregate([
        { 
            $match: { 
                // 🔥 FIX 1: Safely cast to ObjectId
                account: new mongoose.Types.ObjectId(this._id) 
            } 
        },
        { 
            $group: { 
                _id: null, 
                // 🔥 FIX 2: Fixed the spelling typo from "$ammount" to "$amount"
                totalCredit: { 
                    $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] } 
                },
                totalDebit: { 
                    $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] } 
                }
            } 
        }
    ]);

    // If the account has no transactions yet, return 0 balance
    if (result.length === 0) {
        return 0;
    }

    const { totalCredit, totalDebit } = result[0];

    return totalCredit - totalDebit;
};

const accountModel = mongoose.model("Account", accountSchema);

module.exports = accountModel;