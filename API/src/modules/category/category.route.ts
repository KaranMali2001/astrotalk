import { Router } from 'express';
import { getCategories } from './category.controller';

export const categoryRouter = Router();

categoryRouter.get('/', getCategories);
