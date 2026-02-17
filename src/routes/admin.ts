import { Hono } from 'hono';
import { db } from '../index';
import { quizzes, questions, options, gameSessions, participants } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { Layout } from '../lib/html';
import { html, raw } from 'hono/html';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { getLang, getT } from '../lib/i18n';

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
  const lang = getLang(c);
  const t = getT(lang);
  const userQuizzes = await db.select().from(quizzes).where(eq(quizzes.hostId, user.id)).orderBy(desc(quizzes.createdAt));

  return c.html(Layout({
    title: 'Dashboard',
    user,
    lang,
    children: html`
      <div class="mb-10 text-center">
        <h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4 drop-shadow-sm">${t('admin.my_quizzes')}</h1>
        <p class="text-xl text-gray-600 mb-8 font-medium">${t('admin.manage_desc')}</p>
        <a href="/admin/quizzes/new" class="inline-flex items-center gap-2 btn-primary transform hover:scale-105 transition duration-300 shadow-lg px-8 py-3 text-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" /></svg>
          <span>${t('admin.create_quiz')}</span>
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        ${userQuizzes.map(q => html`
          <div class="bg-white rounded-2xl shadow-xl border-b-8 border-purple-200 overflow-hidden transform hover:-translate-y-2 hover:shadow-2xl transition duration-300 flex flex-col h-full">
            <div class="p-6 flex-grow">
                 <div class="flex justify-between items-start mb-4">
                    <h2 class="text-3xl font-bold text-gray-800 leading-tight">${q.title}</h2>
                    <span class="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">${t('admin.quiz_badge')}</span>
                 </div>
                <p class="text-gray-500 text-base leading-relaxed line-clamp-3">${q.description || t('admin.no_description')}</p>
            </div>
            
            <div class="bg-gray-50 p-4 border-t border-gray-100 grid grid-cols-2 gap-3">
              <a href="/admin/quizzes/${q.id}/edit" class="flex justify-center items-center gap-1 text-blue-600 hover:text-white hover:bg-blue-600 font-bold py-2 rounded-lg transition duration-200 border border-transparent hover:border-blue-600">
                ✏️ ${t('admin.edit')}
              </a>
              <button hx-delete="/admin/quizzes/${q.id}" hx-confirm="${t('admin.delete_confirm')}" hx-target="closest .bg-white" hx-swap="outerHTML" class="flex justify-center items-center gap-1 text-red-500 hover:text-white hover:bg-red-500 font-bold py-2 rounded-lg transition duration-200 border border-transparent hover:border-red-500">
                🗑️ ${t('admin.delete')}
              </button>
              <a href="/admin/quizzes/${q.id}/host" class="col-span-2 text-center bg-gradient-to-r from-green-400 to-green-600 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transform active:scale-95 transition duration-200 text-lg flex justify-center items-center gap-2">
                 🚀 ${t('admin.host_game')}
              </a>
            </div>
          </div>
        `)}
        
        ${userQuizzes.length === 0 ? html`
          <div class="col-span-full flex flex-col items-center justify-center py-20 bg-white bg-opacity-60 rounded-3xl border-4 border-dashed border-gray-300">
            <div class="text-8xl mb-6 opacity-30">✨</div>
            <p class="text-3xl text-gray-400 font-bold">${t('admin.no_quizzes')}</p>
            <p class="text-gray-500 mt-2 text-lg">${t('admin.no_quizzes_desc')}</p>
          </div>
        ` : ''}
      </div>
    `
  }));
});

// Create Quiz Form
admin.get('/quizzes/new', (c) => {
    const user = c.get('user');
    const lang = getLang(c);
    const t = getT(lang);

    return c.html(Layout({
        title: t('admin.new_quiz_title'),
        user,
        lang,
        children: html`
            <div class="max-w-xl mx-auto py-12">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-extrabold text-gray-800 mb-2">${t('admin.create_new_quiz')}</h1>
                    <p class="text-gray-500">${t('admin.catchy_title')}</p>
                </div>
                
                <form action="/admin/quizzes" method="post" class="bg-white rounded-2xl shadow-2xl p-8 border-4 border-purple-100 transform transition hover:scale-[1.01]">
                    <div class="mb-6">
                        <label class="block font-bold text-gray-700 mb-2 text-lg">${t('admin.quiz_title_label')}</label>
                        <input type="text" name="title" required placeholder="${t('admin.quiz_title_placeholder')}" 
                            class="w-full border-2 border-gray-200 p-4 rounded-xl text-xl font-bold focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition placeholder-gray-300 text-gray-800">
                    </div>
                    <div class="mb-8">
                        <label class="block font-bold text-gray-700 mb-2 text-lg">${t('admin.description_label')} <span class="text-gray-400 font-normal text-sm">${t('admin.description_optional')}</span></label>
                        <textarea name="description" rows="3" placeholder="${t('admin.description_placeholder')}" 
                            class="w-full border-2 border-gray-200 p-4 rounded-xl text-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition placeholder-gray-300 text-gray-800 resize-none"></textarea>
                    </div>

                    <div class="mb-8">
                        <label class="block font-bold text-gray-700 mb-2 text-lg">${t('admin.game_pacing')}</label>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Host Paced (Default) -->
                            <label class="relative flex items-center p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-purple-200 hover:bg-purple-50 transition">
                                <input type="radio" name="mode" value="HOST" class="w-6 h-6 text-purple-600 border-gray-300 focus:ring-purple-500" checked>
                                <div class="ml-4">
                                    <span class="block font-bold text-gray-800 text-lg">${t('admin.host_controlled')}</span>
                                    <span class="block text-gray-500 text-sm">${t('admin.host_controlled_desc')}</span>
                                </div>
                            </label>

                            <!-- Self Paced -->
                            <label class="relative flex items-center p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-purple-200 hover:bg-purple-50 transition">
                                <input type="radio" name="mode" value="SELF_PACED" class="w-6 h-6 text-purple-600 border-gray-300 focus:ring-purple-500">
                                <div class="ml-4">
                                    <span class="block font-bold text-gray-800 text-lg">${t('admin.self_paced')}</span>
                                    <span class="block text-gray-500 text-sm">${t('admin.self_paced_desc')}</span>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-gray-100">
                        <a href="/admin/dashboard" class="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition text-center">${t('admin.cancel')}</a>
                        <button type="submit" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:-translate-y-1 transition text-lg w-full sm:w-auto">
                            ${t('admin.create_quiz_btn')}
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
    const mode = (body['mode'] as string) || 'HOST';

    await db.insert(quizzes).values({
        hostId: user.id,
        title,
        description,
        mode
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
    
    // Security: Ensure owner
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
    if (!quiz || quiz.hostId !== user.id) return c.text('Unauthorized', 403);
    
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

    return c.redirect(`/admin/game/${result[0].id}`); 
});

// API: Next Question
admin.post('/game/:sessionId/next', async (c) => {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('sessionId'));
    const session = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).get();
    if (!session) return c.json({error: 'Session not found'}, 404);

    // Security: Ensure owner
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, session.quizId)).get();
    if (!quiz || quiz.hostId !== user.id) return c.json({error: 'Unauthorized'}, 403);

    // Get Quiz Questions
    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, session.quizId)).all();
    
    let nextIndex = (session.currentQuestionIndex || 0) + 1;
    
    if (nextIndex >= quizQuestions.length) {
        const leaderboard = await db.select().from(participants)
            .where(eq(participants.sessionId, sessionId))
            .orderBy(desc(participants.score))
            .limit(10)
            .all();

        require('../ws/handler').broadcast(session.pinCode, { type: 'GAME_OVER', leaderboard });
        
        return c.json({ gameOver: true, leaderboard });
    }

    const nextQ = quizQuestions[nextIndex];
    if (!nextQ) return c.json({ gameOver: true });

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

// API: Force End Game
admin.post('/game/:sessionId/end', async (c) => {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('sessionId'));
    const session = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).get();
    if (!session) return c.json({error: 'Session not found'}, 404);

    // Security: Ensure owner
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, session.quizId)).get();
    if (!quiz || quiz.hostId !== user.id) return c.json({error: 'Unauthorized'}, 403);

    // Update Session Status
    await db.update(gameSessions).set({ status: 'FINISHED' }).where(eq(gameSessions.id, sessionId));

    // Get Final Leaderboard
    const leaderboard = await db.select().from(participants)
        .where(eq(participants.sessionId, sessionId))
        .orderBy(desc(participants.score))
        .limit(10)
        .all();

    // Broadcast Game Over to all
    require('../ws/handler').broadcast(session.pinCode, { type: 'GAME_OVER', leaderboard });

    return c.json({ gameOver: true, leaderboard });
});

// Host Game Controller Page
admin.get('/game/:sessionId', async (c) => {
    const user = c.get('user');
    const sessionId = parseInt(c.req.param('sessionId'));
    const lang = getLang(c);
    const t = getT(lang);
    
    const session = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).get();
    
    if(!session) return c.redirect('/admin/dashboard');

    // Security: Ensure owner
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, session.quizId)).get();
    if (!quiz || quiz.hostId !== user.id) return c.redirect('/admin/dashboard');

    const mode = quiz.mode || 'HOST';

    // Restore State: Fetch current players with progress
    const currentPlayers = await db.select({ 
        id: participants.id, 
        name: participants.name,
        currentQuestionIndex: participants.currentQuestionIndex,
        score: participants.score
    }).from(participants).where(eq(participants.sessionId, sessionId)).all();

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

    const hostConfig = {
        initialPlayers: currentPlayers,
        initialStarted: gameStarted,
        initialQuestion: currentQuestion,
        mode: mode,
        initialProgress: mode === 'SELF_PACED' ? currentPlayers.map(p => ({
            id: p.id, 
            name: p.name, 
            qIndex: p.currentQuestionIndex || 0,
            score: p.score || 0
        })) : []
    };

    return c.html(Layout({
        title: t('admin.game_controller'),
        user,
        lang,
        children: html`
            <script>
                window.__hostConfig = ${raw(JSON.stringify(hostConfig))};
            </script>
            <div class="min-h-[80vh] flex flex-col items-center justify-center p-4" x-data="gameController()">
                
                <!-- Lobby Screen -->
                <div x-show="!started" class="w-full max-w-5xl mx-auto text-center">
                    <div class="mb-12">
                         <span class="text-xl font-bold text-purple-200 uppercase tracking-[0.2em] mb-2 block">${t('admin.join_at')} <span class="bg-white text-purple-700 px-2 rounded">quiz.pediacode.web.id</span> ${t('admin.with_pin')}</span>
                         <h1 class="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-500 to-purple-500 drop-shadow-2xl font-mono tracking-wider my-4">${session.pinCode}</h1>
                    </div>

                    <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border-2 border-white/20 shadow-2xl mb-12 min-h-[300px]">
                        <div class="flex justify-between items-center mb-6 px-4">
                             <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                                <span class="bg-green-400 w-3 h-3 rounded-full animate-ping"></span>
                                ${t('admin.waiting_players')}
                             </h2>
                             <span class="bg-white/20 text-white font-bold px-4 py-2 rounded-full" x-text="players.length + ' ${t('admin.joined')}'">0 ${t('admin.joined')}</span>
                        </div>
                        
                         <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            <template x-for="p in players" :key="p.id">
                                <div class="bg-white text-purple-900 font-extrabold py-4 px-6 rounded-2xl shadow-lg transform transition animate-bounce-in text-xl truncate border-b-4 border-purple-200" x-text="p.name"></div>
                            </template>
                            <span x-show="players.length === 0" class="col-span-full py-20 text-white/40 text-2xl font-bold italic">
                                ${t('admin.waiting_crowd')}
                            </span>
                         </div>
                    </div>

                    <div class="flex justify-center gap-6">
                        <button class="bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-black text-3xl px-12 py-6 rounded-full shadow-[0_10px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[10px] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" 
                            @click="startGame" 
                            :disabled="players.length === 0">
                            ${t('admin.start_game')}
                        </button>
                    </div>
                     <div class="mt-8">
                        <a href="/admin/dashboard" class="text-white/60 hover:text-white font-medium hover:underline">${t('admin.exit_game')}</a>
                    </div>
                </div>

                <!-- Active Game Screen -->
                <div x-show="started && !showResults" x-cloak class="w-full max-w-4xl mx-auto">
                    <div class="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-purple-200">
                        <!-- Header -->
                        <div class="bg-purple-600 p-6 flex justify-between items-center text-white">
                             <h1 class="text-2xl font-bold opacity-80">${t('admin.live_game')} <span x-show="mode === 'SELF_PACED'" class="text-sm bg-white/20 px-2 py-1 rounded ml-2">${t('admin.self_paced')}</span></h1>
                             <div class="font-mono bg-purple-800/50 px-4 py-1 rounded-lg">PIN: ${session.pinCode}</div>
                        </div>

                        <div class="p-10 text-center">
                            
                            <!-- HOST PACED VIEW -->
                            <template x-if="mode === 'HOST'">
                                <div>
                                    <!-- Question Display -->
                                     <div class="mb-12">
                                        <span class="text-purple-500 font-bold tracking-widest uppercase text-sm mb-2 block">${t('admin.current_question')}</span>
                                        <h2 class="text-4xl md:text-5xl font-black text-gray-800 leading-tight" x-text="currentQuestion ? currentQuestion.text : '${t('admin.get_ready')}'"></h2>
                                     </div>
                                    
                                    <!-- Stats Grid -->
                                    <div class="grid grid-cols-2 gap-8 mb-12 max-w-xl mx-auto">
                                         <div class="bg-blue-50 p-6 rounded-2xl border-4 border-blue-100">
                                            <span class="block text-6xl font-black text-blue-500 mb-2" x-text="answersCount">0</span>
                                            <span class="text-gray-500 font-bold uppercase tracking-wider text-sm">${t('admin.answers')}</span>
                                         </div>
                                         <div class="bg-pink-50 p-6 rounded-2xl border-4 border-pink-100">
                                            <span class="block text-6xl font-black text-pink-500 mb-2" x-text="players.length">0</span>
                                            <span class="text-gray-500 font-bold uppercase tracking-wider text-sm">${t('admin.players')}</span>
                                         </div>
                                    </div>

                                    <!-- Controls -->
                                    <button class="w-full bg-indigo-600 hover:bg-indigo-800 text-white font-bold text-2xl py-6 rounded-2xl shadow-xl transform transition hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-wait" 
                                        @click="nextQuestion">
                                        ${t('admin.next_question')}
                                    </button>
                                </div>
                            </template>

                            <!-- SELF PACED VIEW -->
                            <template x-if="mode === 'SELF_PACED'">
                                <div>
                                    <h2 class="text-3xl font-black text-gray-800 mb-6">${t('admin.live_progress')}</h2>
                                    
                                    <div class="space-y-4 max-h-[60vh] overflow-y-auto px-4">
                                        <template x-for="p in players" :key="p.id">
                                            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold" x-text="p.name.charAt(0)"></div>
                                                    <div class="text-left">
                                                        <div class="font-bold text-gray-800" x-text="p.name"></div>
                                                        <div class="text-xs text-gray-500 font-medium" x-text="p.status || '${t('admin.playing')}'"></div>
                                                    </div>
                                                </div>
                                                
                                                 <div class="flex items-center gap-4">
                                                    <div class="text-right">
                                                        <span class="text-xs font-bold text-gray-400 uppercase block">${t('game.score')}</span>
                                                        <span class="text-xl font-black text-indigo-600" x-text="p.score || 0"></span>
                                                    </div>
                                                    <div class="flex items-center gap-1 bg-purple-100 px-3 py-1 rounded-full text-purple-600">
                                                        <span class="text-xs font-bold uppercase">Q</span>
                                                        <span class="text-lg font-black" x-text="(p.qIndex !== undefined && p.qIndex > -1) ? (p.qIndex < 500 ? (p.qIndex + 1) : 'Done') : 'Lobby'"></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </div>
                                    
                                    <div class="mt-8">
                                         <button class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg"
                                            @click="forceEndGame">
                                            ${t('admin.end_game')}
                                         </button>
                                    </div>
                                </div>
                            </template>

                        </div>
                    </div>
                </div>

                <!-- Leaderboard / Game Over Screen -->
                <div x-show="showResults" x-cloak class="w-full max-w-4xl mx-auto text-center">
                     <div class="mb-8">
                         <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-xl mb-4">${t('admin.final_results')}</h1>
                         <p class="text-white text-xl font-medium opacity-80">${t('admin.champions_crowned')}</p>
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
                                         <span class="text-xs font-bold text-gray-400 uppercase">${t('admin.points')}</span>
                                     </div>
                                </div>
                            </template>
                         </div>
                         
                         <div class="mt-12 flex justify-center gap-4">
                             <a href="/admin/dashboard" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-8 rounded-xl transition">${t('admin.back_dashboard')}</a>
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
                            mode: config.mode || 'HOST',
                            ws: null,
                            init() {
                                // Init players for self paced
                                if (config.initialProgress) {
                                    this.players = this.players.map(p => {
                                        const prog = config.initialProgress.find(ip => ip.id === p.id);
                                        return { ...p, 
                                            qIndex: prog ? prog.qIndex : -1,
                                            score: prog ? prog.score : (p.score || 0)
                                        };
                                    });
                                }

                                this.ws = new WebSocket('ws://' + window.location.host + '/ws?sessionId=${session.pinCode}&role=HOST');
                                this.ws.onmessage = (event) => {
                                    const data = JSON.parse(event.data);
                                    if (data.type === 'PLAYER_JOINED') {
                                        if (!this.players.find(p => p.id == data.participantId)) {
                                            this.players.push({ id: data.participantId, name: data.name, qIndex: -1, score: 0 });
                                        }
                                    }
                                    if (data.type === 'START') {
                                        this.started = true;
                                    }
                                    if (data.type === 'PARTICIPANT_ANSWER') {
                                        this.answersCount++;
                                        const p = this.players.find(p => p.id == data.participantId);
                                        if (p && data.score !== undefined) {
                                            p.score = data.score;
                                        }
                                    }
                                    if (data.type === 'PARTICIPANT_PROGRESS' && this.mode === 'SELF_PACED') {
                                        const p = this.players.find(p => p.id == data.participantId);
                                        if (p) {
                                            p.qIndex = data.questionIndex;
                                            if (data.score !== undefined) p.score = data.score;
                                        }
                                    }
                                    if (data.type === 'PARTICIPANT_FINISHED') {
                                         const p = this.players.find(p => p.id == data.participantId);
                                         if (p) {
                                            p.status = '${t('admin.finished')}';
                                            p.qIndex = 999; 
                                            if (data.score !== undefined) p.score = data.score;
                                         }
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
                            },
                            async forceEndGame() {
                                const res = await fetch('/admin/game/${session.id}/end', { method: 'POST' }); 
                                const data = await res.json();
                                if (data.gameOver || data.leaderboard) {
                                     this.leaderboard = data.leaderboard || [];
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
admin.get('/quizzes/:id/edit', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));
    const lang = getLang(c);
    const t = getT(lang);
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, id)).get();

    if (!quiz || quiz.hostId !== user.id) return c.redirect('/admin/dashboard');

    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, id)).all();

    return c.html(Layout({
        title: `${t('admin.edit')} ${quiz.title}`,
        user,
        lang,
        children: html`
            <div class="max-w-4xl mx-auto">
                <div class="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4">
                        <a href="/admin/dashboard" class="bg-white p-3 rounded-full shadow hover:shadow-md text-gray-600 transition hover:text-purple-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </a>
                        <div>
                            <span class="text-sm font-bold text-purple-500 uppercase tracking-widest">${t('admin.editing_quiz')}</span>
                            <h1 class="text-4xl font-extrabold text-gray-800 leading-none">${quiz.title}</h1>
                        </div>
                    </div>
                    <a href="/admin/quizzes/${id}/questions/new" class="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg transform hover:-translate-y-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                        <span>${t('admin.add_question')}</span>
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
                                 <button hx-delete="/admin/questions/${q.id}" hx-confirm="${t('admin.delete_question_confirm')}" hx-target="closest .bg-white" hx-swap="outerHTML" class="flex items-center gap-1 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-bold transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    ${t('admin.delete')}
                                 </button>
                            </div>
                        </div>
                    `)}
                    
                    ${quizQuestions.length === 0 ? html`
                        <div class="text-center py-16 bg-white rounded-2xl shadow-inner border-2 border-dashed border-gray-200">
                            <div class="inline-block p-4 rounded-full bg-gray-50 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p class="text-2xl text-gray-400 font-bold mb-2">${t('admin.empty_questions')}</p>
                            <p class="text-gray-500">${t('admin.empty_questions_desc')}</p>
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
    const lang = getLang(c);
    const t = getT(lang);

    return c.html(Layout({
        title: t('admin.new_question_title'),
        user,
        lang,
        children: html`
            <div class="max-w-3xl mx-auto py-8">
                <div class="mb-8 flex items-center gap-4">
                     <a href="/admin/quizzes/${id}/edit" class="bg-white p-2 rounded-full shadow hover:bg-gray-50 transition text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                     </a>
                     <h1 class="text-3xl font-bold text-gray-800">${t('admin.add_new_question')}</h1>
                </div>
                
                <form action="/admin/quizzes/${id}/questions" method="post" class="bg-white rounded-2xl shadow-2xl p-8 border-4 border-purple-100">
                    <div class="mb-8">
                        <label class="block font-bold text-gray-700 text-lg mb-2">${t('admin.question_text')}</label>
                        <input type="text" name="text" required placeholder="${t('admin.question_placeholder')}" 
                            class="w-full border-2 border-gray-200 p-4 rounded-xl text-xl font-bold focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition placeholder-gray-300 text-gray-800">
                    </div>
                    
                    <div class="mb-8">
                        <label class="block font-bold text-gray-700 mb-2">${t('admin.time_limit')}</label>
                         <div class="flex items-center gap-4">
                             <input type="range" name="timeLimit" min="5" max="120" step="5" value="30" oninput="this.nextElementSibling.value = this.value + 's'" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600">
                             <output class="font-bold text-purple-600 w-16 text-right text-lg">30s</output>
                         </div>
                    </div>
                    
                    <label class="block font-bold text-gray-700 text-lg mb-4">${t('admin.answer_options')} <span class="text-sm font-normal text-gray-400 ml-2">${t('admin.mark_correct')}</span></label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Option 1 -->
                        <div class="group relative bg-red-50 p-1 rounded-xl focus-within:ring-4 focus-within:ring-red-200 transition">
                            <div class="absolute top-4 left-4 z-10">
                                <input type="radio" name="correct_option" value="1" required class="w-6 h-6 text-red-600 accent-red-600 cursor-pointer">
                            </div>
                            <div class="bg-red-500 h-full rounded-lg p-6 pt-12 flex flex-col justify-end shadow-md transform group-hover:scale-[1.02] transition">
                                <label class="text-white font-bold opacity-80 text-sm mb-1 uppercase tracking-wider">${t('admin.option_a')}</label>
                                <input type="text" name="option_1" required placeholder="${t('admin.type_answer')}" 
                                    class="w-full bg-white bg-opacity-90 border-0 p-3 rounded-lg font-bold text-red-600 placeholder-red-300 focus:ring-0 focus:bg-white text-lg">
                            </div>
                        </div>

                        <!-- Option 2 -->
                         <div class="group relative bg-blue-50 p-1 rounded-xl focus-within:ring-4 focus-within:ring-blue-200 transition">
                            <div class="absolute top-4 left-4 z-10">
                                <input type="radio" name="correct_option" value="2" class="w-6 h-6 text-blue-600 accent-blue-600 cursor-pointer">
                            </div>
                             <div class="bg-blue-500 h-full rounded-lg p-6 pt-12 flex flex-col justify-end shadow-md transform group-hover:scale-[1.02] transition">
                                <label class="text-white font-bold opacity-80 text-sm mb-1 uppercase tracking-wider">${t('admin.option_b')}</label>
                                <input type="text" name="option_2" required placeholder="${t('admin.type_answer')}" 
                                    class="w-full bg-white bg-opacity-90 border-0 p-3 rounded-lg font-bold text-blue-600 placeholder-blue-300 focus:ring-0 focus:bg-white text-lg">
                            </div>
                        </div>
                        
                        <!-- Option 3 -->
                        <div class="group relative bg-yellow-50 p-1 rounded-xl focus-within:ring-4 focus-within:ring-yellow-200 transition">
                            <div class="absolute top-4 left-4 z-10">
                                <input type="radio" name="correct_option" value="3" class="w-6 h-6 text-yellow-600 accent-yellow-600 cursor-pointer">
                            </div>
                            <div class="bg-yellow-500 h-full rounded-lg p-6 pt-12 flex flex-col justify-end shadow-md transform group-hover:scale-[1.02] transition">
                                <label class="text-white font-bold opacity-80 text-sm mb-1 uppercase tracking-wider">${t('admin.option_c')}</label>
                                <input type="text" name="option_3" placeholder="${t('admin.type_answer')}" 
                                    class="w-full bg-white bg-opacity-90 border-0 p-3 rounded-lg font-bold text-yellow-600 placeholder-yellow-300 focus:ring-0 focus:bg-white text-lg">
                            </div>
                        </div>

                        <!-- Option 4 -->
                        <div class="group relative bg-green-50 p-1 rounded-xl focus-within:ring-4 focus-within:ring-green-200 transition">
                            <div class="absolute top-4 left-4 z-10">
                                <input type="radio" name="correct_option" value="4" class="w-6 h-6 text-green-600 accent-green-600 cursor-pointer">
                            </div>
                            <div class="bg-green-500 h-full rounded-lg p-6 pt-12 flex flex-col justify-end shadow-md transform group-hover:scale-[1.02] transition">
                                <label class="text-white font-bold opacity-80 text-sm mb-1 uppercase tracking-wider">${t('admin.option_d')}</label>
                                <input type="text" name="option_4" placeholder="${t('admin.type_answer')}" 
                                    class="w-full bg-white bg-opacity-90 border-0 p-3 rounded-lg font-bold text-green-600 placeholder-green-300 focus:ring-0 focus:bg-white text-lg">
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-4 mt-10 pt-6 border-t border-gray-100">
                        <a href="/admin/quizzes/${id}/edit" class="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">${t('admin.cancel')}</a>
                        <button type="submit" class="bg-purple-600 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:-translate-y-1 transition text-lg">${t('admin.save_question')}</button>
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
    return c.body(null, 204);
});


export default admin;
