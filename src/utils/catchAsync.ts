import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Higher-Order Function to wrap async Express controllers and forward errors to next()
 * Eliminates repetitive try-catch blocks in controller layer.
 */
export const catchAsync = <
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response,
    next: NextFunction
  ) => Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req as unknown as Request<P, ResBody, ReqBody, ReqQuery>, res, next).catch(next);
  };
};
