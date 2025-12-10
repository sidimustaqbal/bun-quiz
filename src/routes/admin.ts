import { Hono } from 'hono';
import { db } from '../index';
import { quizzes, questions, options, gameSessions, participants } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { Layout } from '../lib/html';
import { html, raw } from 'hono/html';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';

type Variables = {
  user: {
    id: number;
    username: string;
    exp: number;
  }
}

const admin = new Hono<{ Variables: Variables }>();
const SECRET = 'SUPER_SECRET_KEY_CHANGE_ME';

// Auth middleware (simplified)
admin.use('*', async (c, next) => {
  const token = getCookie(c, 'auth_token');
  if (!token) return c.redirect('/auth/login');
  try {
    const payload = await verify(token, SECRET);
    // @ts-ignore
    c.set('user', payload);
    await next();
  } catch (e) {
    return c.redirect('/auth/login');
  }
});

admin.get('/dashboard', async (c) => {
  const user = c.get('user');
  const userQuizzes = await db.select().from(quizzes).where(eq(quizzes.hostId, user.id)).orderBy(desc(quizzes.createdAt));

  return c.html(Layout({
    title: 'Dashboard',
    user,
    children: html`
      <div class="mb-10 text-center">
        <h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4 drop-shadow-sm">My Quizzes</h1>
        <p class="text-xl text-gray-600 mb-8 font-medium">Manage your games or create a new challenge!</p>
        <a href="/admin/quizzes/new" class="inline-flex items-center gap-2 btn-primary transform hover:scale-105 transition duration-300 shadow-lg px-8 py-3 text-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" /></svg>
          <span>Create New Quiz</span>
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        ${userQuizzes.map(q => html`
          <div class="bg-white rounded-2xl shadow-xl border-b-8 border-purple-200 overflow-hidden transform hover:-translate-y-2 hover:shadow-2xl transition duration-300 flex flex-col h-full">
            <div class="p-6 flex-grow">
                 <div class="flex justify-between items-start mb-4">
                    <h2 class="text-3xl font-bold text-gray-800 leading-tight">${q.title}</h2>
                    <span class="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">Quiz</span>
                 </div>
                <p class="text-gray-500 text-base leading-relaxed line-clamp-3">${q.description || 'No description provided.'}</p>
            </div>
            
            <div class="bg-gray-50 p-4 border-t border-gray-100 grid grid-cols-2 gap-3">
              <a href="/admin/quizzes/${q.id}/edit" class="flex justify-center items-center gap-1 text-blue-600 hover:text-white hover:bg-blue-600 font-bold py-2 rounded-lg transition duration-200 border border-transparent hover:border-blue-600">
                ✏️ Edit
              </a>
              <button hx-delete="/admin/quizzes/${q.id}" hx-confirm="Are you sure you want to delete this quiz?" hx-target="closest .bg-white" hx-swap="outerHTML" class="flex justify-center items-center gap-1 text-red-500 hover:text-white hover:bg-red-500 font-bold py-2 rounded-lg transition duration-200 border border-transparent hover:border-red-500">
                🗑️ Delete
              </button>
              <a href="/admin/quizzes/${q.id}/host" class="col-span-2 text-center bg-gradient-to-r from-green-400 to-green-600 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transform active:scale-95 transition duration-200 text-lg flex justify-center items-center gap-2">
                 🚀 Host Game
              </a>
            </div>
          </div>
        `)}
        
        ${userQuizzes.length === 0 ? html`
          <div class="col-span-full flex flex-col items-center justify-center py-20 bg-white bg-opacity-60 rounded-3xl border-4 border-dashed border-gray-300">
            <div class="text-8xl mb-6 opacity-30">✨</div>
            <p class="text-3xl text-gray-400 font-bold">No quizzes yet!</p>
            <p class="text-gray-500 mt-2 text-lg">Create your first quiz to get the party started.</p>
          </div>
        ` : ''}
      </div>
    `
  }));
});

// Create Quiz Form
// Create Quiz Form
admin.get('/quizzes/new', (c) => {
    const user = c.get('user');
    return c.html(Layout({
        title: 'New Quiz',
        user,
        children: html`
            <div class="max-w-xl mx-auto py-12">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-extrabold text-gray-800 mb-2">Create New Quiz</h1>
                    <p class="text-gray-500">Give your new challenge a catchy title!</p>
                </div>
                
                <form action="/admin/quizzes" method="post" class="bg-white rounded-2xl shadow-2xl p-8 border-4 border-purple-100 transform transition hover:scale-[1.01]">
                    <div class="mb-6">
                        <label class="block font-bold text-gray-700 mb-2 text-lg">Quiz Title</label>
                        <input type="text" name="title" required placeholder="e.g. Science Trivia 2024" 
                            class="w-full border-2 border-gray-200 p-4 rounded-xl text-xl font-bold focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition placeholder-gray-300 text-gray-800">
                    </div>
                    <div class="mb-8">
                        <label class="block font-bold text-gray-700 mb-2 text-lg">Description <span class="text-gray-400 font-normal text-sm">(Optional)</span></label>
                        <textarea name="description" rows="3" placeholder="What is this quiz about?" 
                            class="w-full border-2 border-gray-200 p-4 rounded-xl text-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition placeholder-gray-300 text-gray-800 resize-none"></textarea>
                    </div>
                    <div class="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-gray-100">
                        <a href="/admin/dashboard" class="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition text-center">Cancel</a>
                        <button type="submit" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:-translate-y-1 transition text-lg w-full sm:w-auto">
                            Create Quiz
                        </button>
                    </div>
                </form>
            </div>
        `
    }));
});

// Handle Create Quiz
admin.post('/quizzes', async (c) => {
    const user = c.get('user');
    const body = await c.req.parseBody();
    const title = body['title'] as string;
    const description = body['description'] as string;

    await db.insert(quizzes).values({
        hostId: user.id,
        title,
        description
    });

    return c.redirect('/admin/dashboard');
});

// Delete Quiz
admin.delete('/quizzes/:id', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));
    
    // Security: Ensure owner
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, id)).get();
    if (!quiz || quiz.hostId !== user.id) return c.json({error: 'Unauthorized'}, 403);

    await db.delete(quizzes).where(eq(quizzes.id, id));
    return c.body(null, 204);
});

// Host Game (Create Session)
admin.get('/quizzes/:id/host', async (c) => {
    const user = c.get('user');
    const quizId = parseInt(c.req.param('id'));
    
    // Generate PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await db.insert(gameSessions).values({
        quizId,
        pinCode: pin,
        status: 'WAITING',
        currentQuestionIndex: -1,
        startTime: new Date(),
    }).returning();
    
    if (!result[0]) return c.text('Error creating session', 500);

    // Redirect to Host Lobby/Controller
    // Ideally this would be a separate Game Controller page
    return c.redirect(`/admin/game/${result[0].id}`); 
});

// API: Next Question
admin.post('/game/:sessionId/next', async (c) => {
    const sessionId = parseInt(c.req.param('sessionId'));
    const session = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).get();
    if (!session) return c.json({error: 'Session not found'}, 404);

    // Get Quiz Questions
    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, session.quizId)).all();
    
    let nextIndex = (session.currentQuestionIndex || 0) + 1;
    
    if (nextIndex >= quizQuestions.length) {
        // End of Game
        // Get Leaderboard
        const { participants } = require('../db/schema');
        const leaderboard = await db.select().from(participants)
            .where(eq(participants.sessionId, sessionId))
            .orderBy(desc(participants.score))
            .limit(10)
            .all();

        require('../ws/handler').broadcast(session.pinCode, { type: 'GAME_OVER', leaderboard });
        
        return c.json({ gameOver: true, leaderboard });
    }

    const nextQ = quizQuestions[nextIndex];
    if (!nextQ) return c.json({ gameOver: true }); // Should have been caught above but safe check

    // Fetch Options for this question
    const qOptions = await db.select({ id: options.id, text: options.text }).from(options).where(eq(options.questionId, nextQ.id)).all();

    // Update Session
    console.log('[DEBUG] /next - Updating currentQuestionIndex to:', nextIndex, 'for sessionId:', sessionId);
    await db.update(gameSessions).set({ currentQuestionIndex: nextIndex }).where(eq(gameSessions.id, sessionId));
    console.log('[DEBUG] /next - Update complete');

    // Broadcast Question WITH Options
    require('../ws/handler').broadcast(session.pinCode, { 
        type: 'NEXT_QUESTION', 
        question: {
            text: nextQ.text,
            timeLimit: nextQ.timeLimit,
            options: qOptions
        }
    });

    return c.json({ question: nextQ });
});

// Host Game Controller Page
admin.get('/game/:sessionId', async (c) => {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('sessionId'));
    
    const session = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).get();
    
    if(!session) return c.redirect('/admin/dashboard');

    // Restore State: Fetch current players
    const currentPlayers = await db.select({ id: participants.id, name: participants.name }).from(participants).where(eq(participants.sessionId, sessionId)).all();

    // Restore State: If game has started (has currentQuestionIndex), fetch current question
    let currentQuestion = null;
    let gameStarted = false;
    console.log('[DEBUG] Host controller - session.currentQuestionIndex:', session.currentQuestionIndex);
    if (session.currentQuestionIndex !== null && session.currentQuestionIndex >= 0) {
        gameStarted = true;
        const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, session.quizId)).all();
        const q = quizQuestions[session.currentQuestionIndex];
        console.log('[DEBUG] Host controller - gameStarted:', gameStarted, 'questionIndex:', session.currentQuestionIndex, 'q:', q?.text);
        if (q) {
            currentQuestion = { text: q.text, timeLimit: q.timeLimit };
        }
    }

    return c.html(Layout({
        title: 'Game Controller',
        user,
        children: html`
            <script>
                window.__hostConfig = ${raw(JSON.stringify({
                    initialPlayers: currentPlayers,
                    initialStarted: gameStarted,
                    initialQuestion: currentQuestion
                }))};
            </script>
            <div class="min-h-[80vh] flex flex-col items-center justify-center p-4" x-data="gameController()">
                
                <!-- Lobby Screen -->
                <div x-show="!started" class="w-full max-w-5xl mx-auto text-center">
                    <div class="mb-12">
                         <span class="text-xl font-bold text-purple-200 uppercase tracking-[0.2em] mb-2 block">Join at <span class="bg-white text-purple-700 px-2 rounded">bun-quiz.com</span> with PIN:</span>
                         <h1 class="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-500 to-purple-500 drop-shadow-2xl font-mono tracking-wider my-4">${session.pinCode}</h1>
                    </div>

                    <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border-2 border-white/20 shadow-2xl mb-12 min-h-[300px]">
                        <div class="flex justify-between items-center mb-6 px-4">
                             <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                                <span class="bg-green-400 w-3 h-3 rounded-full animate-ping"></span>
                                Waiting for players...
                             </h2>
                             <span class="bg-white/20 text-white font-bold px-4 py-2 rounded-full" x-text="players.length + ' Joined'">0 Joined</span>
                        </div>
                        
                         <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            <template x-for="p in players" :key="p.id">
                                <div class="bg-white text-purple-900 font-extrabold py-4 px-6 rounded-2xl shadow-lg transform transition animate-bounce-in text-xl truncate border-b-4 border-purple-200" x-text="p.name"></div>
                            </template>
                            <span x-show="players.length === 0" class="col-span-full py-20 text-white/40 text-2xl font-bold italic">
                                Music is playing... waiting for the crowd! 🎵
                            </span>
                         </div>
                    </div>

                    <div class="flex justify-center gap-6">
                        <button class="bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-black text-3xl px-12 py-6 rounded-full shadow-[0_10px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[10px] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" 
                            @click="startGame" 
                            :disabled="players.length === 0">
                            Start Game! 🚀
                        </button>
                    </div>
                     <div class="mt-8">
                        <a href="/admin/dashboard" class="text-white/60 hover:text-white font-medium hover:underline">Exit Game</a>
                    </div>
                </div>

                <!-- Active Game Screen -->
                <div x-show="started && !showResults" x-cloak class="w-full max-w-4xl mx-auto">
                    <div class="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-purple-200">
                        <!-- Header -->
                        <div class="bg-purple-600 p-6 flex justify-between items-center text-white">
                             <h1 class="text-2xl font-bold opacity-80">Live Game</h1>
                             <div class="font-mono bg-purple-800/50 px-4 py-1 rounded-lg">PIN: ${session.pinCode}</div>
                        </div>

                        <div class="p-10 text-center">
                            <!-- Question Display -->
                             <div class="mb-12">
                                <span class="text-purple-500 font-bold tracking-widest uppercase text-sm mb-2 block">Current Question</span>
                                <h2 class="text-4xl md:text-5xl font-black text-gray-800 leading-tight" x-text="currentQuestion ? currentQuestion.text : 'Get Ready...'"></h2>
                             </div>
                            
                            <!-- Stats Grid -->
                            <div class="grid grid-cols-2 gap-8 mb-12 max-w-xl mx-auto">
                                 <div class="bg-blue-50 p-6 rounded-2xl border-4 border-blue-100">
                                    <span class="block text-6xl font-black text-blue-500 mb-2" x-text="answersCount">0</span>
                                    <span class="text-gray-500 font-bold uppercase tracking-wider text-sm">Answers</span>
                                 </div>
                                 <div class="bg-pink-50 p-6 rounded-2xl border-4 border-pink-100">
                                    <span class="block text-6xl font-black text-pink-500 mb-2" x-text="players.length">0</span>
                                    <span class="text-gray-500 font-bold uppercase tracking-wider text-sm">Players</span>
                                 </div>
                            </div>

                            <!-- Controls -->
                            <button class="w-full bg-indigo-600 hover:bg-indigo-800 text-white font-bold text-2xl py-6 rounded-2xl shadow-xl transform transition hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-wait" 
                                @click="nextQuestion">
                                Next Question ➡️
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Leaderboard / Game Over Screen -->
                <div x-show="showResults" x-cloak class="w-full max-w-4xl mx-auto text-center">
                     <div class="mb-8">
                         <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-xl mb-4">🏆 Final Results 🏆</h1>
                         <p class="text-white text-xl font-medium opacity-80">The champions have been crowned!</p>
                     </div>

                     <div class="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-yellow-300 p-8">
                         <div class="space-y-4">
                            <template x-for="(p, index) in leaderboard" :key="p.id">
                                <div class="flex items-center p-4 rounded-xl transition hover:scale-[1.02]"
                                    :class="{
                                        'bg-yellow-100 border-2 border-yellow-300': index === 0,
                                        'bg-gray-100 border-2 border-gray-200': index === 1,
                                        'bg-orange-50 border-2 border-orange-200': index === 2,
                                        'bg-white border border-gray-100': index > 2
                                    }">
                                     <div class="w-12 h-12 flex items-center justify-center font-black text-2xl rounded-full mr-4"
                                        :class="{
                                            'bg-yellow-400 text-white shadow-lg': index === 0,
                                            'bg-gray-400 text-white shadow-md': index === 1,
                                            'bg-orange-400 text-white shadow-md': index === 2,
                                            'bg-gray-200 text-gray-500': index > 2
                                        }" x-text="index + 1"></div>
                                     
                                     <div class="flex-1 text-left">
                                         <h3 class="text-2xl font-bold text-gray-800" x-text="p.name"></h3>
                                     </div>
                                     
                                     <div class="text-right">
                                         <span class="block text-3xl font-black text-purple-600" x-text="p.score"></span>
                                         <span class="text-xs font-bold text-gray-400 uppercase">Points</span>
                                     </div>
                                </div>
                            </template>
                         </div>
                         
                         <div class="mt-12 flex justify-center gap-4">
                             <a href="/admin/dashboard" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-8 rounded-xl transition">Back to Dashboard</a>
                         </div>
                     </div>
                </div>

                <script>
                    function gameController() {
                        const config = window.__hostConfig || {};
                        return {
                            started: config.initialStarted || false,
                            showResults: false,
                            players: config.initialPlayers || [],
                            leaderboard: [],
                            currentQuestion: config.initialQuestion || null,
                            answersCount: 0,
                            ws: null,
                            init() {
                                this.ws = new WebSocket('ws://' + window.location.host + '/ws?sessionId=${session.pinCode}&role=HOST'); // Use PIN as Room ID
                                this.ws.onmessage = (event) => {
                                    const data = JSON.parse(event.data);
                                    if (data.type === 'PLAYER_JOINED') {
                                        this.players.push({ id: data.participantId, name: data.name });
                                    }
                                    if (data.type === 'START') {
                                        this.started = true;
                                        // removed auto-nextQuestion to prevent race condition
                                    }
                                    if (data.type === 'PARTICIPANT_ANSWER') {
                                        this.answersCount++;
                                    }
                                };
                            },
                            startGame() {
                                this.ws.send(JSON.stringify({ type: 'START_GAME' }));
                            },
                            async nextQuestion() {
                                this.answersCount = 0;
                                const res = await fetch('/admin/game/${session.id}/next', { method: 'POST' });
                                const data = await res.json();
                                if (data.question) {
                                    this.currentQuestion = data.question;
                                    this.started = true;
                                } else if (data.gameOver) {
                                    this.leaderboard = data.leaderboard;
                                    this.showResults = true;
                                }
                            }
                        }
                    }
                </script>
            </div>
        `
    }));
});

// View Quiz / Manage Questions
// View Quiz / Manage Questions
admin.get('/quizzes/:id/edit', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, id)).get();

    if (!quiz || quiz.hostId !== user.id) return c.redirect('/admin/dashboard');

    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, id)).all();

    return c.html(Layout({
        title: `Edit ${quiz.title}`,
        user,
        children: html`
            <div class="max-w-4xl mx-auto">
                <div class="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4">
                        <a href="/admin/dashboard" class="bg-white p-3 rounded-full shadow hover:shadow-md text-gray-600 transition hover:text-purple-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </a>
                        <div>
                            <span class="text-sm font-bold text-purple-500 uppercase tracking-widest">Editing Quiz</span>
                            <h1 class="text-4xl font-extrabold text-gray-800 leading-none">${quiz.title}</h1>
                        </div>
                    </div>
                    <a href="/admin/quizzes/${id}/questions/new" class="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg transform hover:-translate-y-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                        <span>Add Question</span>
                    </a>
                </div>

                <div class="space-y-6">
                    ${quizQuestions.map((q, idx) => html`
                        <div class="bg-white rounded-xl shadow-md border-l-8 border-purple-500 p-6 flex flex-col md:flex-row justify-between items-center gap-4 transform transition hover:shadow-lg">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <span class="bg-purple-100 text-purple-700 font-black px-3 py-1 rounded-lg text-sm">Q${idx + 1}</span>
                                    <span class="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>${q.timeLimit}s</span>
                                    </span>
                                </div>
                                <h3 class="text-xl font-bold text-gray-800">${q.text}</h3>
                            </div>
                            <div class="flex items-center gap-3">
                                 <button hx-delete="/admin/questions/${q.id}" hx-confirm="Are you sure you want to delete this question?" hx-target="closest .bg-white" hx-swap="outerHTML" class="flex items-center gap-1 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-bold transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete
                                 </button>
                            </div>
                        </div>
                    `)}
                    
                    ${quizQuestions.length === 0 ? html`
                        <div class="text-center py-16 bg-white rounded-2xl shadow-inner border-2 border-dashed border-gray-200">
                            <div class="inline-block p-4 rounded-full bg-gray-50 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p class="text-2xl text-gray-400 font-bold mb-2">It's quiet here...</p>
                            <p class="text-gray-500">Add your first question to build this quiz!</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `
    }));
});

// Add Question Form
admin.get('/quizzes/:id/questions/new', (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    return c.html(Layout({
        title: 'Add Question',
        user,
        children: html`
            <div class="max-w-3xl mx-auto py-8">
                <div class="mb-8 flex items-center gap-4">
                     <a href="/admin/quizzes/${id}/edit" class="bg-white p-2 rounded-full shadow hover:bg-gray-50 transition text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                     </a>
                     <h1 class="text-3xl font-bold text-gray-800">Add New Question</h1>
                </div>
                
                <form action="/admin/quizzes/${id}/questions" method="post" class="bg-white rounded-2xl shadow-2xl p-8 border-4 border-purple-100">
                    <div class="mb-8">
                        <label class="block font-bold text-gray-700 text-lg mb-2">Question Text</label>
                        <input type="text" name="text" required placeholder="e.g. What is the capital of France?" 
                            class="w-full border-2 border-gray-200 p-4 rounded-xl text-xl font-bold focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition placeholder-gray-300 text-gray-800">
                    </div>
                    
                    <div class="mb-8">
                        <label class="block font-bold text-gray-700 mb-2">Time Limit</label>
                         <div class="flex items-center gap-4">
                             <input type="range" name="timeLimit" min="5" max="120" step="5" value="30" oninput="this.nextElementSibling.value = this.value + 's'" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600">
                             <output class="font-bold text-purple-600 w-16 text-right text-lg">30s</output>
                         </div>
                    </div>
                    
                    <label class="block font-bold text-gray-700 text-lg mb-4">Answer Options <span class="text-sm font-normal text-gray-400 ml-2">(Mark the correct one)</span></label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Option 1 -->
                        <div class="group relative bg-red-50 p-1 rounded-xl focus-within:ring-4 focus-within:ring-red-200 transition">
                            <div class="absolute top-4 left-4 z-10">
                                <input type="radio" name="correct_option" value="1" required class="w-6 h-6 text-red-600 accent-red-600 cursor-pointer">
                            </div>
                            <div class="bg-red-500 h-full rounded-lg p-6 pt-12 flex flex-col justify-end shadow-md transform group-hover:scale-[1.02] transition">
                                <label class="text-white font-bold opacity-80 text-sm mb-1 uppercase tracking-wider">Option A (Red)</label>
                                <input type="text" name="option_1" required placeholder="Type answer here..." 
                                    class="w-full bg-white bg-opacity-90 border-0 p-3 rounded-lg font-bold text-red-600 placeholder-red-300 focus:ring-0 focus:bg-white text-lg">
                            </div>
                        </div>

                        <!-- Option 2 -->
                         <div class="group relative bg-blue-50 p-1 rounded-xl focus-within:ring-4 focus-within:ring-blue-200 transition">
                            <div class="absolute top-4 left-4 z-10">
                                <input type="radio" name="correct_option" value="2" class="w-6 h-6 text-blue-600 accent-blue-600 cursor-pointer">
                            </div>
                             <div class="bg-blue-500 h-full rounded-lg p-6 pt-12 flex flex-col justify-end shadow-md transform group-hover:scale-[1.02] transition">
                                <label class="text-white font-bold opacity-80 text-sm mb-1 uppercase tracking-wider">Option B (Blue)</label>
                                <input type="text" name="option_2" required placeholder="Type answer here..." 
                                    class="w-full bg-white bg-opacity-90 border-0 p-3 rounded-lg font-bold text-blue-600 placeholder-blue-300 focus:ring-0 focus:bg-white text-lg">
                            </div>
                        </div>
                        
                        <!-- Option 3 -->
                        <div class="group relative bg-yellow-50 p-1 rounded-xl focus-within:ring-4 focus-within:ring-yellow-200 transition">
                            <div class="absolute top-4 left-4 z-10">
                                <input type="radio" name="correct_option" value="3" class="w-6 h-6 text-yellow-600 accent-yellow-600 cursor-pointer">
                            </div>
                            <div class="bg-yellow-500 h-full rounded-lg p-6 pt-12 flex flex-col justify-end shadow-md transform group-hover:scale-[1.02] transition">
                                <label class="text-white font-bold opacity-80 text-sm mb-1 uppercase tracking-wider">Option C (Yellow)</label>
                                <input type="text" name="option_3" placeholder="Type answer here..." 
                                    class="w-full bg-white bg-opacity-90 border-0 p-3 rounded-lg font-bold text-yellow-600 placeholder-yellow-300 focus:ring-0 focus:bg-white text-lg">
                            </div>
                        </div>

                        <!-- Option 4 -->
                        <div class="group relative bg-green-50 p-1 rounded-xl focus-within:ring-4 focus-within:ring-green-200 transition">
                            <div class="absolute top-4 left-4 z-10">
                                <input type="radio" name="correct_option" value="4" class="w-6 h-6 text-green-600 accent-green-600 cursor-pointer">
                            </div>
                            <div class="bg-green-500 h-full rounded-lg p-6 pt-12 flex flex-col justify-end shadow-md transform group-hover:scale-[1.02] transition">
                                <label class="text-white font-bold opacity-80 text-sm mb-1 uppercase tracking-wider">Option D (Green)</label>
                                <input type="text" name="option_4" placeholder="Type answer here..." 
                                    class="w-full bg-white bg-opacity-90 border-0 p-3 rounded-lg font-bold text-green-600 placeholder-green-300 focus:ring-0 focus:bg-white text-lg">
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-4 mt-10 pt-6 border-t border-gray-100">
                        <a href="/admin/quizzes/${id}/edit" class="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Cancel</a>
                        <button type="submit" class="bg-purple-600 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:-translate-y-1 transition text-lg">Save Question</button>
                    </div>
                </form>
            </div>
        `
    }));
});

// Handle Add Question
admin.post('/quizzes/:id/questions', async (c) => {
    const quizId = parseInt(c.req.param('id'));
    const body = await c.req.parseBody();
    
    // Insert Question
    const result = await db.insert(questions).values({
        quizId,
        text: body['text'] as string,
        timeLimit: parseInt(body['timeLimit'] as string)
    }).returning();
    const question = result[0];

    if (!question) return c.text('Error creating question', 500);

    // Insert Options
    // This is a bit manual but works for now
    const opts = [];
    if (body['option_1']) opts.push({ text: body['option_1'], idx: '1' });
    if (body['option_2']) opts.push({ text: body['option_2'], idx: '2' });
    if (body['option_3']) opts.push({ text: body['option_3'], idx: '3' });
    if (body['option_4']) opts.push({ text: body['option_4'], idx: '4' });

    for (const opt of opts) {
        await db.insert(options).values({
            questionId: question.id,
            text: opt.text as string,
            isCorrect: body['correct_option'] === opt.idx
        });
    }

    return c.redirect(`/admin/quizzes/${quizId}/edit`);
});

// Delete Question
admin.delete('/questions/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    await db.delete(questions).where(eq(questions.id, id));
    // Also delete options... (cascading not set up in Drizzle explicitly here, but SQLite FK might handle if enabled, otherwise orphan rows)
    // For now simple delete.
    return c.body(null, 204);
});


export default admin;
