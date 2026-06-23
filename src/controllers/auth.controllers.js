const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
// At the top of auth.controllers.js
// const { sendRegistrationEmail } = require('../services/email.service');

const blocklistModel = require('../models/blackList.model');

async function userRegisterController(req, res) {
    try {
        const { email, name, password } = req.body;

        // 1. Check if user exists
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            return res.status(400).json({ 
                message: 'Email already exists',
                status: 'failed'
            });
        }

        // 2. Create the user
        const user = await userModel.create({
            email,
            name,
            password
        });

        // 3. Generate the JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '3d'
        });

        // 4. Set the cookie
        res.cookie("token", token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3 * 24 * 60 * 60 * 1000 
        });

        // // 🔥 FIXED: Send the email HERE (Inside the try block, BEFORE the return statement)
        // // We use try/catch around it so an email failure doesn't ruin a successful registration
        // // Inside your userRegisterController try block
        // try {
        //     await sendRegistrationEmail(user.email, user.name); // Clean and direct!
        // } catch (emailErr) {
        //     console.error("Email failed to send, but user was created:", emailErr);
        // }

        // 5. Send successful response
        return res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            message: 'User registered successfully and welcome email sent',
            status: 'success'
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({
            message: 'Internal server error',
            status: 'error'
        });
    }
}

/**
 * - User Login Controller
 * - Post /api/auth/login
 */

async function userLoginController(req, res) {
    const { email, password } = req.body;

    const user = await userModel.findOne({email}).select('+password'); // Need to select password for comparison

    if (!user) {
        return res.status(400).json({
            message: 'Invalid email or password',
            status: 'failed'
        });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        return res.status(400).json({
            message: 'Invalid email or password',
            status: 'failed'
        });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '3d'
    });

    res.cookie("token", token, {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 3 * 24 * 60 * 60 * 1000 
    });

    return res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        message: 'User logged in successfully',
        status: 'success'
    });     

}

async function userLogoutController(req, res) {
   const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(400).json({
            message: 'No token provided',
            status: 'failed'
        });
    }

    try {
        // Add the token to the blocklist
        await blocklistModel.create({ token });

        // Clear the cookie
        res.clearCookie("token");

        return res.status(200).json({
            message: 'User logged out successfully',
            status: 'success'
        });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({
            message: 'Internal server error during logout',
            status: 'error'
        });
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
};