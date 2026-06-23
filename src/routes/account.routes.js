const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares/auth.middleware');

const { createAccountController,getAllAccountsController,getSingleAccountBalanceController } = require('../controllers/account.controllers');

router.post('/', authMiddleware, createAccountController);

//get all accounts for a user
router.get('/all', authMiddleware,getAllAccountsController);
router.get('/:accountId/balance',authMiddleware,getSingleAccountBalanceController);

module.exports = router;