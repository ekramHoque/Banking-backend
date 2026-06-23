const mongoose = require('mongoose');

const BlackListSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, 'Token is required'],
        unique: [true, 'Token must be unique']
    }
}, {
    timestamps: true
});


BlackListSchema.index(
    { createdAt: 1 }, 
    { expireAfterSeconds: 60 * 60 * 24 * 3 } 
);

const tokenBlacklistModel = mongoose.model("BlackList", BlackListSchema);

module.exports = tokenBlacklistModel;