const mongoose = require('mongoose');
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

const accountModel = mongoose.model("Account", accountSchema);

module.exports = accountModel;