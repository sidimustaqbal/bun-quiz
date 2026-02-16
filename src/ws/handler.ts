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

            // Check if Self Paced and already started?
            const { db } = require('../index');
            const { gameSessions, quizzes, participants, questions, options } = require('../db/schema');
            const { eq } = require('drizzle-orm');
            
            const session = await db.select().from(gameSessions).where(eq(gameSessions.pinCode, gameId)).get();
            if (session && session.status === 'ACTIVE') {
                 const quiz = await db.select().from(quizzes).where(eq(quizzes.id, session.quizId)).get();
                 if (quiz.mode === 'SELF_PACED') {
                     const participant = await db.select().from(participants).where(eq(participants.id, parseInt(data.participantId))).get();
                     // If fresh join, index might be -1.
                     let idx = participant.currentQuestionIndex;
                     if (idx === -1) {
                         idx = 0;
                         await db.update(participants).set({ currentQuestionIndex: 0 }).where(eq(participants.id, participant.id));
                     }
                     
                     // Send current question
                     const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, session.quizId)).all();
                     if (idx < quizQuestions.length) {
                         const nextQ = quizQuestions[idx];
                         const qOptions = await db.select({ id: options.id, text: options.text }).from(options).where(eq(options.questionId, nextQ.id)).all();
                         ws.send(JSON.stringify({ 
                            type: 'NEXT_QUESTION', 
                            question: {
                                text: nextQ.text,
                                timeLimit: nextQ.timeLimit,
                                options: qOptions
                            }
                        }));
                     }
                 }
            }
        }
        
        // Host starts game
        if (data.type === 'START_GAME' && ws.data.role === 'HOST') {
            const { db } = require('../index');
            const { gameSessions, quizzes, questions, options, participants } = require('../db/schema');
            const { eq } = require('drizzle-orm');

            // 1. Update Session Status to ACTIVE
            await db.update(gameSessions)
                .set({ status: 'ACTIVE', startTime: new Date() })
                .where(eq(gameSessions.pinCode, gameId));

            // 2. Broadcast START to transition everyone to /play or active state
            broadcast(gameId, { type: 'START' });
            
            const session = await db.select().from(gameSessions).where(eq(gameSessions.pinCode, gameId)).get();
            const quiz = await db.select().from(quizzes).where(eq(quizzes.id, session.quizId)).get();
            
            if (quiz.mode === 'SELF_PACED') {
                const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, session.quizId)).all();
                if (quizQuestions.length > 0) {
                     const nextQ = quizQuestions[0];
                     const qOptions = await db.select({ id: options.id, text: options.text }).from(options).where(eq(options.questionId, nextQ.id)).all();
                     
                     // 3. Initialize all participants to index 0 in DB
                     await db.update(participants)
                        .set({ currentQuestionIndex: 0 })
                        .where(eq(participants.sessionId, session.id));

                     // 4. Send first question to all
                     broadcast(gameId, {
                        type: 'NEXT_QUESTION', 
                        question: {
                            text: nextQ.text,
                            timeLimit: nextQ.timeLimit,
                            options: qOptions
                        }
                    });
                }
            }
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
            const { questions, options, answers, participants, gameSessions, quizzes } = require('../db/schema');
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
                isCorrect, 
                points,
                score: (participant.score || 0) + points
            });
            
            // Ack to Participant
            ws.send(JSON.stringify({ type: 'ANSWER_RECEIVED', points, score: (participant.score || 0) + points }));

            // SELF PACED LOGIC
            // quizzes already imported above
            const session = await db.select().from(gameSessions).where(eq(gameSessions.pinCode, gameId)).get();
            const quiz = await db.select().from(quizzes).where(eq(quizzes.id, session.quizId)).get();

            if (quiz.mode === 'SELF_PACED') {
                 // 1. Advance Participant Index
                 const nextIndex = (participant.currentQuestionIndex || 0) + 1;
                 await db.update(participants).set({ currentQuestionIndex: nextIndex }).where(eq(participants.id, participantId));

                 // 2. Fetch Next Question
                 const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, session.quizId)).all();
                 
                 if (nextIndex >= quizQuestions.length) {
                     // Finished
                      ws.send(JSON.stringify({ type: 'GAME_OVER_SELF', score: (participant.score || 0) + points }));
                      // Notify Host of finish
                      broadcast(gameId, { 
                          type: 'PARTICIPANT_FINISHED', 
                          participantId: ws.data.userId,
                          score: (participant.score || 0) + points 
                      });
                 } else {
                     const nextQ = quizQuestions[nextIndex];
                     const qOptions = await db.select({ id: options.id, text: options.text }).from(options).where(eq(options.questionId, nextQ.id)).all();
                     
                     // Send Next Question ONLY to this participant
                     ws.send(JSON.stringify({ 
                        type: 'NEXT_QUESTION', 
                        question: {
                            text: nextQ.text,
                            timeLimit: nextQ.timeLimit,
                            options: qOptions
                        }
                    }));
                    
                    // Notify Host of progress
                    broadcast(gameId, { 
                        type: 'PARTICIPANT_PROGRESS', 
                        participantId: ws.data.userId, 
                        questionIndex: nextIndex,
                        score: (participant.score || 0) + points 
                    });
                 }
            }
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
