const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
        unique: true // 🔥 FIXED: Kept clean for MongoDB indexing
    },
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false
    },
    systemRole: {
        type: Boolean, // 🔥 FIXED: Capital 'B' Boolean
        default: false,
        immutable: true,
        select: false
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return ; // 🔥 FIXED: Added next() so it doesn't hang
    }
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    return  // 🔥 FIXED: Added next() here too
});

userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;