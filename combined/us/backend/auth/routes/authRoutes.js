const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerValidation, loginValidation } = require('../middleware/validators');

router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
