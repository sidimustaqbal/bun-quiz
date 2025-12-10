import type { ServerWebSocket } from 'bun';

export interface WebSocketData {
  gameId?: string; // session id
  userId?: string; // participant id or 'HOST'
  role: 'HOST' | 'PARTICIPANT';
  name?: string;
  createdAt: number;
}

// Store connections: gameId -> Set of WebSockets
const games = new Map<string, Set<ServerWebSocket<WebSocketData>>>();

export const websocketHandler = {
  open(ws: ServerWebSocket<WebSocketData>) {
    const gameId = ws.data.gameId;
    if (gameId) {
        if (!games.has(gameId)) {
            games.set(gameId, new Set());
        }
        games.get(gameId)?.add(ws);
        
        console.log(`WS Connected to Game ${gameId} (${ws.data.role})`);
        
        // If participant, notify HOST
        if (ws.data.role === 'PARTICIPANT') {
             // We wait for explicit JOIN message for name usually, but if we have it:
             // broadcast(gameId, ...);
        }
    }
  },
  
  async message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    try {
        const msgStr = typeof message === 'string' ? message : message.toString();
        const data = JSON.parse(msgStr);
        console.log('WS Msg:', data);
        const gameId = ws.data.gameId;

        if (!gameId) return;

        if (data.type === 'JOIN') {
            // Update local data with name if provided
            ws.data.name = data.name;
            ws.data.userId = data.participantId;
            
            // Broadcast to Host that player joined
            broadcast(gameId, {
                type: 'PLAYER_JOINED',
                participantId: data.participantId,
                name: data.name
            });
        }
        
        // Host starts game
        if (data.type === 'START_GAME' && ws.data.role === 'HOST') {
            broadcast(gameId, { type: 'START' });
        }
        
        // Host Next Question
        if (data.type === 'NEXT_QUESTION' && ws.data.role === 'HOST') {
             broadcast(gameId, { type: 'NEXT_QUESTION', question: data.question });
        }
        
        // Host Show Results
        if (data.type === 'SHOW_RESULTS' && ws.data.role === 'HOST') {
            broadcast(gameId, { type: 'SHOW_RESULTS' });
        }

        // Participant Answer
        if (data.type === 'ANSWER' && ws.data.role === 'PARTICIPANT') {
            const { db } = require('../index');
            const { questions, options, answers, participants, gameSessions } = require('../db/schema');
            const { eq, and } = require('drizzle-orm');

            // data: { type: 'ANSWER', participantId: ..., optionId: ..., timeTaken: ... }
            const optionId = data.optionId;
            const participantId = ws.data.userId ? parseInt(ws.data.userId) : null;
            
            if (!participantId || !optionId) return;

            // Verify Option
            const option = await db.select().from(options).where(eq(options.id, optionId)).get();
            const participant = await db.select().from(participants).where(eq(participants.id, participantId)).get();
            
            if (!option || !participant) return;

            // Check if already answered for this question? (Skip for now for simplicity or assume UI prevents)
            // Ideally we check `answers` table

            const isCorrect = option.isCorrect;
            let points = 0;
            if (isCorrect) {
                // Simple scoring: 1000 base, minus time decay?
                // For now, fixed 1000
                points = 100; 
                // Update Score
                await db.update(participants)
                    .set({ score: (participant.score || 0) + points })
                    .where(eq(participants.id, participantId));
            }

            // Record Answer
            await db.insert(answers).values({
                participantId,
                questionId: option.questionId,
                optionId,
                timeTaken: data.timeTaken || 0,
                isCorrect
            });

            // Broadcast to Host to update stats/score
            broadcast(gameId, {
                type: 'PARTICIPANT_ANSWER',
                participantId: ws.data.userId,
                name: ws.data.name,
                isCorrect, // Host might want to know for stats
                points
            });
            
            // Ack to Participant?
            ws.send(JSON.stringify({ type: 'ANSWER_RECEIVED', points, score: (participant.score || 0) + points }));
        }

    } catch (e) {
        console.error('WS Error', e);
    }
  },
  
  close(ws: ServerWebSocket<WebSocketData>) {
     const gameId = ws.data.gameId;
     if (gameId && games.has(gameId)) {
         games.get(gameId)?.delete(ws);
         if (ws.data.role === 'PARTICIPANT') {
             broadcast(gameId, {
                 type: 'PLAYER_LEFT',
                 participantId: ws.data.userId
             });
         }
     }
  },
};

export const broadcast = (gameId: string, message: any) => {
    const clients = games.get(gameId);
    if (clients) {
        const msg = JSON.stringify(message);
        for (const client of clients) {
            client.send(msg);
        }
    }
};
