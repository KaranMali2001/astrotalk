import { failure, success } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { profService } from '../professional/prof.service';
import { userService } from '../user/user.service';
import { CheckUserRequest } from './zod';

export async function checkUser(req: Request, res: Response) {
  const { phoneNumber } = req.body as CheckUserRequest;

  const { data: userData, error: userError } = await tryCatch(userService.getUserByNumber(phoneNumber));
  const { data: profData, error: profError } = await tryCatch(profService.getProfByNumber(phoneNumber));
  if (userError || profError) {
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to check user');
  }

  return success(res, StatusCodes.OK, 'User found', { user: userData ?? null, prof: profData ?? null });
}
