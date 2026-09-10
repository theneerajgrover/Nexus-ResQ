// ============================================================
// REAL-TIME SERVER-SENT EVENTS (SSE) ROUTER
// ============================================================
import { Router, Request, Response } from 'express';

export const realtimeRouter = Router();

const clients: Response[] = [];

// GET /api/events
realtimeRouter.get('/', (req: Request, res: Response) => {
  const isSSE = req.headers.accept?.includes('text/event-stream');
  if (req.headers.accept?.includes('application/json') && !isSSE) {
    res.json({
      status: 'ok',
      service: 'nexus-resq-realtime-sse',
      connectedClients: clients.length,
      timestamp: Date.now(),
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  clients.push(res);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    const idx = clients.indexOf(res);
    if (idx !== -1) clients.splice(idx, 1);
  });
});

/**
 * Broadcasts an operational update to all connected clients.
 */
export function broadcastEvent(type: string, payload: any) {
  const message = `data: ${JSON.stringify({ type, payload, timestamp: Date.now() })}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(message);
    } catch {
      // client disconnected
    }
  });
}
