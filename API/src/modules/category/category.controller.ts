import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '@/app';
import { success, failure } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';

export async function getCategories(req: Request, res: Response) {
  const { data: categories, error } = await tryCatch(
    prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  );

  if (error) {
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch categories');
  }

  return success(res, StatusCodes.OK, 'Categories fetched successfully', categories);
}
