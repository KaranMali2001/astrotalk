export {};
declare global {
  namespace Express {
    interface Request {
      userid: string;

      role: string;
    }
  }
}
