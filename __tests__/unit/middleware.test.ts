import { describe, it, expect, vi, beforeEach } from 'vitest';
import toolsFilterMiddleware from '../../src/middleware';

describe('toolsFilterMiddleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { method: 'POST', body: {} };
    res = {
      writeHead: vi.fn().mockReturnThis(),
      write: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      removeHeader: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    // Clear ENABLED_TOOLS before each test
    delete process.env.ENABLED_TOOLS;
  });

  it('should call next() immediately if ENABLED_TOOLS is not set', () => {
    toolsFilterMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('should filter tools when ENABLED_TOOLS is set', () => {
    process.env.ENABLED_TOOLS = 'plone_get_content,plone_search';
    
    const originalEnd = res.end; // Save the mock
    toolsFilterMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    // Mock response for tools/list
    const originalBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: {
        tools: [
          { name: 'plone_get_content' },
          { name: 'plone_search' },
          { name: 'plone_delete_content' },
          { name: 'plone_configure' }
        ]
      }
    });

    // Simulate res.end call from transport
    // This calls the middleware's wrapped res.end
    res.end(originalBody);

    // Get the actual filtered body sent to originalEnd (the mock)
    const filteredBody = originalEnd.mock.calls[0][0];
    const data = JSON.parse(filteredBody);

    const toolNames = data.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('plone_get_content');
    expect(toolNames).toContain('plone_search');
    expect(toolNames).toContain('plone_configure');
    expect(toolNames).not.toContain('plone_delete_content');
  });

  it('should always include plone_configure even if not in ENABLED_TOOLS', () => {
    process.env.ENABLED_TOOLS = 'plone_get_content';
    
    const originalEnd = res.end;
    toolsFilterMiddleware(req, res, next);
    
    const originalBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: {
        tools: [
          { name: 'plone_get_content' },
          { name: 'plone_configure' }
        ]
      }
    });

    res.end(originalBody);
    const data = JSON.parse(originalEnd.mock.calls[0][0]);
    const toolNames = data.result.tools.map((t: any) => t.name);
    
    expect(toolNames).toContain('plone_get_content');
    expect(toolNames).toContain('plone_configure');
  });

  it('should remove Content-Length in writeHead', () => {
    process.env.ENABLED_TOOLS = 'some_tool';
    toolsFilterMiddleware(req, res, next);

    const headers = { 'Content-Length': '100', 'Content-Type': 'application/json' };
    res.writeHead(200, headers);

    expect(headers['Content-Length']).toBeUndefined();
    expect(res.removeHeader).toHaveBeenCalledWith('Content-Length');
  });

  it('should handle chunked data in res.write and res.end', () => {
    process.env.ENABLED_TOOLS = 'plone_search';
    
    const originalEnd = res.end;
    toolsFilterMiddleware(req, res, next);

    const part1 = '{"jsonrpc": "2.0", "id": 1, "result": {"tools": [';
    const part2 = '{"name": "plone_search"}, {"name": "plone_configure"}, {"name": "plone_delete"}]}}';

    res.write(Buffer.from(part1));
    res.end(Buffer.from(part2));

    const data = JSON.parse(originalEnd.mock.calls[0][0]);
    const toolNames = data.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('plone_search');
    expect(toolNames).toContain('plone_configure');
    expect(toolNames).not.toContain('plone_delete');
  });
});
