import { PloneToolHandlers } from "./handlers.js";

class PloneHandlersSingleton {
  private static instance: PloneToolHandlers;

  private constructor() {} // Private constructor to prevent direct instantiation

  public static get handlers(): PloneToolHandlers {
    if (!PloneHandlersSingleton.instance) {
      // Initialize with a dummy client; it will be configured later by plone_configure
      PloneHandlersSingleton.instance = new PloneToolHandlers(null);
    }
    return PloneHandlersSingleton.instance;
  }

  // Method to set the actual configured instance (e.g., from PloneMCPServer)
  public static setInstance(handlers: PloneToolHandlers): void {
    PloneHandlersSingleton.instance = handlers;
  }
}

export const ploneHandlersSingleton = PloneHandlersSingleton.handlers;
export const setPloneHandlersInstance = PloneHandlersSingleton.setInstance;