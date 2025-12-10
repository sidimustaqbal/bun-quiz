import { Hono } from 'hono';
import { db } from '../index';
import { gameSessions, participants, questions, options, answers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Layout } from '../lib/html';
import { html, raw } from 'hono/html';
import { setCookie, getCookie } from 'hono/cookie';

const game = new Hono();

// Join Landing Page (Scan QR lands here with ?pin=...)
game.get('/', (c) => {
    const pin = c.req.query('pin') || '';
    return c.html(Layout({
        title: 'Join Game',
        fullWidth: true,
        children: html`
            <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-500 to-indigo-600">
                <div class="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
                    <div class="bg-purple-100 p-8 text-center border-b-4 border-purple-200">
                        <span class="text-6xl mb-2 block">🎉</span>
                        <h1 class="text-4xl font-black text-purple-600 tracking-tight">FunQuiz!</h1>
                        <p class="text-purple-400 font-bold uppercase tracking-widest text-xs mt-2">Join the Party</p>
                    </div>
                    
                    <form action="/join" method="post" class="p-8 space-y-6">
                        <div>
                            <label class="block font-bold text-gray-500 text-sm mb-2 uppercase tracking-wide">Game PIN</label>
                            <input type="tel" name="pin" value="${pin}" placeholder="000 000" required 
                                class="w-full text-center text-4xl font-mono font-bold tracking-[0.2em] border-2 border-gray-200 rounded-xl p-4 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition placeholder-gray-300 text-gray-800">
                        </div>
                        <div>
                            <label class="block font-bold text-gray-500 text-sm mb-2 uppercase tracking-wide">Nickname</label>
                            <input type="text" name="name" placeholder="Enter your name" required maxlength="15"
                                class="w-full text-center text-2xl font-bold border-2 border-gray-200 rounded-xl p-4 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition placeholder-gray-300 text-gray-800">
                        </div>
                        <button class="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xl py-5 rounded-2xl shadow-xl transform transition active:scale-95 hover:-translate-y-1">
                            Enter Game 🚀
                        </button>
                    </form>
                </div>
                <p class="text-white/50 text-sm mt-8 font-medium">Ready to play?</p>
            </div>
        `
    }));
});

game.get('/join/:pin', (c) => {
    const pin = c.req.param('pin');
    return c.redirect(`/?pin=${pin}`);
});

// Handle Join
game.post('/join', async (c) => {
    const body = await c.req.parseBody();
    const pin = body['pin'] as string;
    const name = body['name'] as string;

    const session = await db.select().from(gameSessions).where(eq(gameSessions.pinCode, pin)).get();
    
    if (!session) {
        return c.text('Game not found!', 404); // Improve UI later
    }

    if (session.status !== 'WAITING') {
        return c.text('Game already started or finished!', 400);
    }

    // Register participant
    const result = await db.insert(participants).values({
        sessionId: session.id,
        name
    }).returning();
    const p = result[0];
    if (!p) return c.text('Failed to join', 500);

    // Set auth cookie for participant
    setCookie(c, 'participant_id', p.id.toString(), { httpOnly: false }); // httpOnly false so JS can read if needed, or secure it.
    
    return c.redirect('/lobby');
});

// Game Play Interface
game.get('/play', async (c) => {
    const pId = getCookie(c, 'participant_id');
    if (!pId) return c.redirect('/');
    
    // We need to fetch session details, but optimization: assume validated or handle error in UI
    const participant = await db.select().from(participants).where(eq(participants.id, parseInt(pId))).get();
    if(!participant) return c.redirect('/');
    
    // Check if game session is actually active?
    const session = await db.select().from(gameSessions).where(eq(gameSessions.id, participant.sessionId)).get();
    if (!session) return c.redirect('/');

    // Restore State
    let initialState = 'WAITING';
    let currentOptions: { id: number; text: string }[] = [];
    
    if (session.currentQuestionIndex !== null && session.currentQuestionIndex >= 0) {
        // Fetch current question
        // We need to order to get the correct index, assuming ID order or created order if not specified? 
        // Best to use same query logic as admin (select all) or simple offset
        // Assuming questions are stable.
        const q = await db.select().from(questions)
            .where(eq(questions.quizId, session.quizId))
            .limit(1)
            .offset(session.currentQuestionIndex)
            .get();
        
        if (q) {
            initialState = 'QUESTION';
            // Fetch options
            currentOptions = await db.select({ id: options.id, text: options.text }).from(options).where(eq(options.questionId, q.id)).all();

            // Check if answered
            const ans = await db.select().from(answers).where(
                and(
                    eq(answers.participantId, participant.id),
                    eq(answers.questionId, q.id)
                )
            ).get();

            if (ans) {
                initialState = 'ANSWERED';
            }
        }
    }
    
    return c.html(Layout({
        title: 'Play!',
        fullWidth: true,
        children: html`
            <script>
                window.__playerConfig = ${raw(JSON.stringify({
                    initialState: initialState,
                    initialOptions: currentOptions
                }))};
            </script>
            <div x-data="playerGame()" class="flex flex-col h-screen bg-gray-50 overflow-hidden">
                <!-- Header -->
                <div class="bg-white p-4 shadow-md flex justify-between items-center z-10">
                     <span class="font-black text-gray-700 text-lg truncate max-w-[150px]">${participant.name}</span>
                     <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-gray-400 uppercase">Score</span>
                        <span class="bg-purple-600 text-white px-4 py-1 rounded-full font-bold shadow-sm" x-text="score">${participant.score}</span>
                     </div>
                </div>

                <!-- WAITING STATE -->
                <div x-show="state === 'WAITING'" class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-purple-600 text-white">
                    <div class="mb-8 p-6 bg-white/10 rounded-full animate-pulse">
                        <span class="text-6xl">👀</span>
                    </div>
                    <h1 class="text-3xl font-black mb-4">Eyes on the Screen!</h1>
                    <p class="text-white/80 text-lg">Waiting for the next question...</p>
                </div>

                <!-- QUESTION STATE -->
                <div x-show="state === 'QUESTION'" class="flex-1 flex flex-col p-4 bg-gray-100" x-cloak>
                     <div class="flex-1 flex flex-col justify-center mb-4">
                        <div class="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-gray-200 text-center mb-6">
                            <h2 class="text-xl font-bold text-gray-400 uppercase tracking-widest mb-2">Question Live</h2>
                            <p class="text-4xl font-black text-gray-800">Look up! 👆</p>
                        </div>
                        <!-- Timer Bar -->
                        <div class="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                             <div class="bg-purple-500 h-full transition-all duration-1000 ease-linear" :style="'width: ' + (timer/30*100) + '%'"></div>
                        </div>
                     </div>
                     
                     <!-- Answer Buttons -->
                     <div class="grid grid-cols-2 gap-4 h-96 pb-6">
                        <template x-for="(opt, idx) in currentOptions" :key="opt.id">
                            <button @click="submitAnswer(opt.id)" 
                                :class="{
                                    'bg-red-500 hover:bg-red-600 shadow-[0_8px_0_rgb(185,28,28)]': idx === 0,
                                    'bg-blue-500 hover:bg-blue-600 shadow-[0_8px_0_rgb(29,78,216)]': idx === 1,
                                    'bg-yellow-500 hover:bg-yellow-600 shadow-[0_8px_0_rgb(202,138,4)]': idx === 2,
                                    'bg-green-500 hover:bg-green-600 shadow-[0_8px_0_rgb(21,128,61)]': idx === 3
                                }"
                                class="h-full rounded-2xl active:shadow-none active:translate-y-[8px] transition flex flex-col items-center justify-center p-4 group relative overflow-hidden">
                                
                                <!-- Icon/Shape Overlay -->
                                <span class="text-white opacity-20 absolute inset-0 text-9xl font-black flex items-center justify-center pointer-events-none group-hover:scale-110 transition"
                                    x-text="['▲', '◆', '●', '■'][idx] || '?'"></span>
                                
                                <span class="text-white text-3xl font-black drop-shadow-md z-10 text-center leading-tight" x-text="opt.text"></span>
                            </button>
                        </template>
                     </div>
                </div>
                
                 <!-- ANSWERED STATE -->
                 <div x-show="state === 'ANSWERED'" class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-indigo-600 text-white" x-cloak>
                    <div class="mb-8 bg-white/20 p-8 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h1 class="text-4xl font-black mb-2">Answer Sent!</h1>
                    <p class="text-indigo-200 text-xl font-bold">Fingers crossed... 🤞</p>
                    <div class="mt-8 bg-black/20 rounded-xl p-4">
                        <p class="text-sm font-bold uppercase tracking-widest text-indigo-300">Your Score</p>
                        <p class="text-3xl font-black text-white" x-text="score">0</p>
                    </div>
                </div>



                 <!-- RESULT STATE -->
                 <div x-show="state === 'RESULT'" class="flex-1 flex flex-col p-4 bg-purple-600 text-center overflow-y-auto" x-cloak>
                    <div class="mb-6 mt-4">
                        <h1 class="text-4xl font-black text-white mb-2">Game Over!</h1>
                        <div class="bg-white/20 rounded-xl p-4 inline-block backdrop-blur-sm">
                            <span class="block text-xs font-bold text-indigo-100 uppercase tracking-widest">Your Final Score</span>
                            <span class="text-5xl font-black text-white" x-text="score">0</span>
                        </div>
                    </div>

                    <div class="space-y-3 pb-8">
                        <template x-for="(p, index) in leaderboard" :key="p.id">
                            <div class="flex items-center p-3 rounded-xl shadow-lg border-b-4"
                                :class="{
                                    'bg-yellow-100 border-yellow-300': index === 0,
                                    'bg-gray-100 border-gray-300': index === 1,
                                    'bg-orange-100 border-orange-300': index === 2,
                                    'bg-white border-purple-200': index > 2
                                }">
                                <div class="w-10 h-10 flex items-center justify-center font-bold rounded-full mr-3 text-lg"
                                    :class="{
                                        'bg-yellow-400 text-white': index === 0,
                                        'bg-gray-400 text-white': index === 1,
                                        'bg-orange-400 text-white': index === 2,
                                        'bg-purple-100 text-purple-600': index > 2
                                    }" x-text="index + 1"></div>
                                <div class="flex-1 text-left font-bold text-gray-800 text-lg truncate" x-text="p.name"></div>
                                <div class="font-black text-purple-600 text-xl" x-text="p.score"></div>
                            </div>
                        </template>
                    </div>

                    <div class="mt-4 pb-12">
                         <a href="/" class="inline-block bg-white text-purple-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 transition transform hover:scale-105">
                            Leave Game 🏠
                         </a>
                    </div>
                </div>

                <script>
                    function playerGame() {
                        const config = window.__playerConfig || {};
                        return {
                            state: config.initialState || 'WAITING',
                            score: ${participant.score},
                            timer: 30,
                            currentOptions: config.initialOptions || [],
                            leaderboard: [],
                            ws: null,
                            init() {
                                this.ws = new WebSocket('ws://' + window.location.host + '/ws?sessionId=${session.pinCode}&role=PARTICIPANT&participantId=${participant.id}');
                                this.ws.onmessage = (event) => {
                                    const data = JSON.parse(event.data);
                                    if (data.type === 'NEXT_QUESTION') {
                                        this.state = 'QUESTION';
                                        this.timer = 100; // Mock timer reset
                                        this.currentOptions = data.question.options || []; // Load options
                                        // Start countdown locally or sync with server
                                    }
                                    if (data.type === 'ANSWER_RECEIVED') {
                                        // Update score locally if we want instant feedback or wait for server
                                        if (data.score) this.score = data.score;
                                        // Keep state as ANSWERED until next question? Or show mini result?
                                    }
                                    if (data.type === 'GAME_OVER') {
                                        this.state = 'RESULT';
                                        this.leaderboard = data.leaderboard || [];
                                    }
                                };
                            },
                            submitAnswer(optionId) {
                                this.state = 'ANSWERED';
                                this.ws.send(JSON.stringify({
                                    type: 'ANSWER',
                                    participantId: ${participant.id},
                                    optionId: optionId,
                                    timeTaken: 1000 // mock
                                }));
                            }
                        }
                    }
                </script>
            </div>
        `
    }));
}); 

// Lobby (Waiting Room)
game.get('/lobby', async (c) => {
    const pId = getCookie(c, 'participant_id');
    if (!pId) return c.redirect('/');

    const participant = await db.select().from(participants).where(eq(participants.id, parseInt(pId))).get();
    if(!participant) return c.redirect('/');

    // Fetch session for PIN
    const session = await db.select().from(gameSessions).where(eq(gameSessions.id, participant.sessionId)).get();
    if (!session) return c.redirect('/');

    // TODO: Verify session status?

    return c.html(Layout({
        title: 'Lobby',
        fullWidth: true,
        children: html`
            <div class="flex flex-col items-center justify-center min-h-screen bg-purple-600 p-4 text-center">
                <div class="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-bounce-in">
                    <h1 class="text-3xl font-black text-gray-800 mb-6 uppercase tracking-wider">You're In!</h1>
                    
                    <div class="relative mb-8">
                        <div class="absolute inset-0 bg-gradient-to-tr from-pink-400 to-purple-500 rounded-full blur opacity-75 animate-pulse"></div>
                        <div class="relative bg-white p-6 rounded-full border-4 border-purple-100 shadow-sm">
                             <div class="text-5xl">😎</div>
                        </div>
                    </div>

                    <div class="bg-gray-100 p-4 rounded-xl border-2 border-gray-200 mb-6">
                         <p class="text-gray-500 text-xs font-bold uppercase mb-1">Your Nickname</p>
                         <span class="text-3xl font-extrabold text-purple-600 break-all">${participant.name}</span>
                    </div>

                    <p class="text-lg text-gray-500 font-bold animate-pulse flex items-center justify-center gap-2">
                        <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                        Waiting for host...
                    </p>
                </div>
                
                <p class="mt-8 text-white/60 font-medium text-sm">Do not close this window</p>

                <!-- WS Connection for Participant -->
                <script>
                    const ws = new WebSocket('ws://' + window.location.host + '/ws?sessionId=${session.pinCode}&participantId=${participant.id}');
                    ws.onopen = () => {
                        console.log('Connected to Lobby');
                        ws.send(JSON.stringify({ type: 'JOIN', participantId: ${participant.id}, name: "${participant.name}" }));
                    };
                    ws.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        console.log('Msg:', data);
                        if(data.type === 'START') {
                            window.location.href = '/play';
                        }
                    };
                </script>
            </div>
        `
    }));
});

export default game;
