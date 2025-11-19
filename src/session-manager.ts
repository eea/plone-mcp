import { PloneService } from "./plone-service";

class SessionManager {
    private sessions: Map<string, PloneService> = new Map();

    public getSession(sessionId: string): PloneService {
        if (!this.sessions.has(sessionId)) {
            // Initialize with a dummy client; it will be configured later by plone_configure
            this.sessions.set(sessionId, new PloneService(null));
        }
        return this.sessions.get(sessionId)!;
    }

    public clearSession(sessionId: string): void {
        this.sessions.delete(sessionId);
    }
}

export const sessionManager = new SessionManager();
