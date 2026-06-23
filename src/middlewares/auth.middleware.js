const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");

async function authMiddleware(req,res,next){

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(401).json({
            message: "Unauthorized: No token provided",
            status: "failed"
        });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId);

        req.user = user;

        next();

    }catch(error){
        console.error("Auth Middleware Error:", error);
        return res.status(401).json({
            message: "Unauthorized: Invalid token",
            status: "failed"
        });
    }
}

async function systemAuthMiddleware(req,res,next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(401).json({
            message: "Unauthorized: No token provided",
            status: "failed"
        });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId).select('+systemRole');

        if(!user || !user.systemRole){
            return res.status(403).json({
                message: "Forbidden: You do not have the required permissions",
                status: "failed"
            });
        }

        req.user = user;
        next();

    }catch(error){
        console.error("System Auth Middleware Error:", error);
        return res.status(401).json({
            message: "Unauthorized: Invalid token",
            status: "failed"
        });
    }
        
}

module.exports = {
    authMiddleware,
    systemAuthMiddleware
};