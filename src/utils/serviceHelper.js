/**
 * Service Helper
 * Provides utility functions for service layer to work with tenant databases
 */

/**
 * Wraps a service class to automatically inject tenantPrisma from req
 * @param {Class} ServiceClass - The service class to wrap
 * @returns {Proxy} Proxied service that injects prisma
 */
function createServiceProxy(ServiceClass) {
  const serviceInstance = new ServiceClass();
  
  return new Proxy(serviceInstance, {
    get(target, prop) {
      const original = target[prop];
      
      // If it's not a function or it's a constructor, return as-is
      if (typeof original !== 'function' || prop === 'constructor') {
        return original;
      }
      
      // Return a wrapper function that expects req as first parameter
      return function(req, ...args) {
        // If req has tenantPrisma, inject it as first argument
        if (req && req.tenantPrisma) {
          return original.call(target, req.tenantPrisma, ...args);
        }
        // Otherwise, assume first arg is already prisma (for direct calls)
        return original.call(target, req, ...args);
      };
    }
  });
}

/**
 * Simple wrapper that binds a prisma instance to a service
 * @param {Class} ServiceClass - The service class
 * @param {PrismaClient} prisma - The prisma client to bind
 * @returns {Object} Service instance with prisma bound
 */
function bindPrismaToService(ServiceClass, prisma) {
  const service = new ServiceClass();
  const boundService = {};
  
  // Bind all methods with prisma as first argument
  Object.getOwnPropertyNames(Object.getPrototypeOf(service)).forEach(method => {
    if (method !== 'constructor' && typeof service[method] === 'function') {
      boundService[method] = (...args) => service[method](prisma, ...args);
    }
  });
  
  return boundService;
}

module.exports = {
  createServiceProxy,
  bindPrismaToService
};
