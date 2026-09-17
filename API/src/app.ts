import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { adminRoutes } from '@/modules/admin/admin.route';
import { authRouter } from '@/modules/auth/auth.route';
import { callRouter } from '@/modules/call/call.route';
import { categoryRouter } from '@/modules/category/category.route';
import { feedbackRouter } from '@/modules/feedback/feedback.route';
import { profRouter } from '@/modules/professional/prof.route';
import { userRouter } from '@/modules/user/user.route';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import singletonPrisma from './utils/prisma';
config();
console.log(config().parsed);
export const app = express();
export const prisma = singletonPrisma;
// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100000, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);
// Global middleware
app.use(compression());
app.use(cookieParser());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
// CORS configuration - allows localhost ports and production frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',

  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
// app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : ':method :url :status :response-time ms - :res[content-length]'));

// app.set('trust proxy', true);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/professional', profRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/call', callRouter);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/feedback', feedbackRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler - must be before error handler
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);
