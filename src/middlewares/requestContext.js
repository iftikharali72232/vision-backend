/**
 * Request Context for Prisma
 * Provides async-local storage for request-scoped prisma clients
 * This allows services to access the correct tenant prisma without explicit passing
 */

const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Middleware to set request context
 */
function setRequestContext(req, res, next) {
  const context = {
    tenantPrisma: req.tenantPrisma,
    branchId: req.branchId,
    user: req.user
  };
  
  asyncLocalStorage.run(context, () => {
    next();
  });
}

/**
 * Get current request's tenant prisma client
 * @returns {PrismaClient} Tenant prisma client for current request
 */
function getCurrentPrisma() {
  const context = asyncLocalStorage.getStore();
  if (!context || !context.tenantPrisma) {
    throw new Error('No tenant prisma client in current context. Ensure setRequestContext middleware is used.');
  }
  return context.tenantPrisma;
}

/**
 * Get current branch ID
 * @returns {number} Current branch ID
 */
function getCurrentBranchId() {
  const context = asyncLocalStorage.getStore();
  return context?.branchId;
}

/**
 * Get current user
 * @returns {object} Current user object
 */
function getCurrentUser() {
  const context = asyncLocalStorage.getStore();
  return context?.user;
}

module.exports = {
  setRequestContext,
  getCurrentPrisma,
  getCurrentBranchId,
  getCurrentUser,
  asyncLocalStorage
};
