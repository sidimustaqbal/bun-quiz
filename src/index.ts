import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './db/schema';

import auth from './routes/auth';
import admin from './routes/admin';

const app = new Hono();
const sqlite = new Database('quiz.db');
export const db = drizzle(sqlite, { schema });

// Middleware
app.use('/*', serveStatic({ root: './public' }));

import game from './routes/game';

app.route('/auth', auth);
app.route('/admin', admin);
app.route('/', game);

import { websocketHandler } from './ws/handler';

// ...

export default {
    fetch(req: Request, server: any) {
        const url = new URL(req.url);
        if (url.pathname === '/ws') {
             // Upgrade to WebSocket
             const sessionId = url.searchParams.get('sessionId');
             const role = url.searchParams.get('role') || 'PARTICIPANT';
             const participantId = url.searchParams.get('participantId');
             
             if (server.upgrade(req, {
                 data: {
                     gameId: sessionId,
                     role,
                     userId: participantId,
                     createdAt: Date.now(),
                 }
             })) {
                 return; // Upgraded
             }
             return new Response('Upgrade failed', { status: 500 });
        }
        return app.fetch(req, server);
    },
    websocket: websocketHandler,
    port: process.env.PORT || 3000,
};
