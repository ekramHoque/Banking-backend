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
    
    const creditEntries = await ledgerModel.aggregate([
        { $match: { account: this._id, type: "CREDIT" } },
        { $group: { _id: null, totalCredit: { $sum: "$ammount" } } }
    ]);

    const debitEntries = await ledgerModel.aggregate([
        { $match: { account: this._id, type: "DEBIT" } },
        { $group: { _id: null, totalDebit: { $sum: "$ammount" } } }
    ]);

    const totalCredit = creditEntries[0] ? creditEntries[0].totalCredit : 0;
    const totalDebit = debitEntries[0] ? debitEntries[0].totalDebit : 0;

    return totalCredit - totalDebit;
}

const accountModel = mongoose.model("Account", accountSchema);

module.exports = accountModel;