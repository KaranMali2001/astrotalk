import { Router } from 'express';
import * as adminController from './admin.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { adminMiddleware } from '@/middlewares/admin.middleware';

const router = Router();

// Public routes (Authentication)
router.post('/send-otp', adminController.sendOtp);
router.post('/verify-otp', adminController.verifyOtp);

// Protected admin routes (require admin authentication)
router.use(authMiddleware); // Verify JWT token
router.use(adminMiddleware); // Verify admin role

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User Management Routes
router.get('/users', adminController.getAllUsers);
router.patch('/users/status', adminController.updateUserStatus);
router.patch('/users/wallet', adminController.updateUserWallet);

// User-specific routes
router.get('/users/:userId', adminController.getUserById);
router.get('/users/:userId/transactions', adminController.getUserTransactions);
router.get('/users/:userId/calls', adminController.getUserCallHistory);

// Professional Management Routes
router.get('/professionals', adminController.getAllProfessionals);
router.patch('/professionals/verify', adminController.verifyProfessional);
router.patch('/professionals/status', adminController.updateProfessionalStatus);
router.patch('/professionals/wallet', adminController.updateProfessionalWallet);
router.patch('/professionals/rates', adminController.updateProfessionalRates);

// Professional-specific routes
router.get('/professionals/:professionalId', adminController.getProfessionalById);
router.get('/professionals/:professionalId/transactions', adminController.getProfessionalTransactions);
router.get('/professionals/:professionalId/calls', adminController.getProfessionalCallHistory);
router.get('/professionals/:professionalId/earnings', adminController.getProfessionalEarnings);

// Reports & Analytics
router.get('/reports/calls', adminController.getCallsReport);

export { router as adminRoutes };