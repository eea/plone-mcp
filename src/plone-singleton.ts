import { PloneService } from "./plone-service";

class PloneHandlersSingleton {
  private static instance: PloneService;

  private constructor() {} // Private constructor to prevent direct instantiation

  public static get handlers(): PloneService {
    if (!PloneHandlersSingleton.instance) {
      // Initialize with a dummy client; it will be configured later by plone_configure
      PloneHandlersSingleton.instance = new PloneService(null);
    }
    return PloneHandlersSingleton.instance;
  }

  // Method to set the actual configured instance (e.g., from PloneMCPServer)
  public static setInstance(handlers: PloneService): void {
    PloneHandlersSingleton.instance = handlers;
  }
}

export const ploneHandlersSingleton = PloneHandlersSingleton.handlers;
export const setPloneHandlersInstance = PloneHandlersSingleton.setInstance;