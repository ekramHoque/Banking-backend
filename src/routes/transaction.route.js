const {Router} = require('express');
const { authMiddleware,systemAuthMiddleware } = require('../middlewares/auth.middleware');
const {createTransactionController,createSystemTransactionController} = require('../controllers/transaction.controllers');

const transactionRouter = Router();


transactionRouter.post('/',authMiddleware,createTransactionController);

transactionRouter.post('/system/intial-funds',systemAuthMiddleware,createSystemTransactionController);


module.exports = transactionRouter;