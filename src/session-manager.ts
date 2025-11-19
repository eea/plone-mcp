import { PloneService } from "plone-mcp/plone-service";

class SessionManager {
  private sessions: Map<string, PloneService> = new Map<string, PloneService>();

  public getSession(sessionId: string): PloneService {
    if (!this.sessions.has(sessionId)) {
      // Initialize with a dummy client; it will be configured later by plone_configure
      this.sessions.set(sessionId, new PloneService(null));
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found after initialization.`);
    }
    return session;
  }

  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const sessionManager = new SessionManager();
