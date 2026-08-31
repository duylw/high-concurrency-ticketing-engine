/**
 * Higher-Order Function to wrap async Express controllers and forward errors to next()
 * Eliminates repetitive try-catch blocks in controller layer.
 *
 * @param {Function} fn - Async controller function (req, res, next)
 * @returns {Function} Express middleware handler
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
