const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account reference is required'],
        index: true,
        immutable: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        immutable: true,
        min: [0, 'Amount must be a positive number']
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: [true, 'Transaction reference is required'],
        index: true,
        immutable: true
    },
    type: {
        type: String,
        enum: {
            values: ["CREDIT", "DEBIT"],
            message: 'Type must be either CREDIT or DEBIT',
        },
        required: [true, 'Type is required'],
        immutable: true
    }

},{
    timestamps: true
});

function preventLedgerModification() {
  throw new Error("Ledger entries are immutable and cannot be modified or deleted.");
}

ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('updateMany', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('deleteMany', preventLedgerModification);
ledgerSchema.pre('remove', preventLedgerModification);
ledgerSchema.pre('findOneAndDelete', preventLedgerModification);
ledgerSchema.pre('findOneAndRemove', preventLedgerModification);



const ledgerModel = mongoose.model("Ledger", ledgerSchema);

module.exports = ledgerModel;