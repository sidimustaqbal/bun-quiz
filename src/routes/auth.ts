import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';

const auth = new Hono();
const SECRET = 'SUPER_SECRET_KEY_CHANGE_ME'; // TODO: env var

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Helper to render auth pages with errors
const renderAuthPage = (c: any, type: 'login' | 'register', error?: string, formData?: any) => {
  const { Layout } = require('../lib/html');
  const { html } = require('hono/html');
  
  const isLogin = type === 'login';
  const title = isLogin ? 'Login' : 'Register';
  const action = isLogin ? '/auth/login' : '/auth/register';
  const altLink = isLogin ? '/auth/register' : '/auth/login';
  const altText = isLogin ? 'Need an account? Register here' : 'Already have an account? Login';
  
  return c.html(Layout({
    title,
    children: html`
    <div class="flex items-center justify-center min-h-[80vh]">
      <div class="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl border-4 border-${isLogin ? 'secondary' : 'primary'} transform hover:scale-[1.01] transition duration-300">
        <div class="text-center">
            <h2 class="text-4xl font-extrabold text-${isLogin ? 'purple' : 'red'}-600 mb-2">${isLogin ? 'Welcome Back!' : 'Join the Fun!'}</h2>
            <p class="text-gray-500">${isLogin ? 'Login to host your quiz' : 'Create an account to host quizzes'}</p>
        </div>
        
        ${error ? html`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert"><strong class="font-bold">Error!</strong> <span class="block sm:inline">${error}</span></div>` : ''}

        <form action="${action}" method="post" class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2" for="username">Username</label>
              <input type="text" placeholder="Username" name="username" value="${formData?.username || ''}" required 
                class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-${isLogin ? 'purple' : 'red'}-500 focus:ring-4 focus:ring-${isLogin ? 'purple' : 'red'}-200 transition duration-200">
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2" for="password">Password</label>
              <input type="password" placeholder="Password" name="password" required
                class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-${isLogin ? 'purple' : 'red'}-500 focus:ring-4 focus:ring-${isLogin ? 'purple' : 'red'}-200 transition duration-200">
            </div>
            
            <button class="w-full ${isLogin ? 'btn-primary' : 'bg-red-500 hover:bg-red-600 text-white'} font-bold py-3 px-4 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95 text-xl">
                ${title}
            </button>
            
            <div class="text-center mt-4">
                <a href="${altLink}" class="text-sm text-${isLogin ? 'purple' : 'red'}-600 hover:text-${isLogin ? 'purple' : 'red'}-800 font-bold hover:underline">
                    ${altText}
                </a>
            </div>
        </form>
      </div>
    </div>
    `
  }));
};

auth.post('/register', zValidator('form', registerSchema, async (result, c) => {
    if (!result.success) {
        // Safe error access
        const issue = result.error.issues?.[0] || result.error.errors?.[0];
        const error = issue?.message || 'Invalid input';
        
        // Repulate form data (safeParse doesn't return data on error, need raw body)
        const formData = await c.req.parseBody();
        return renderAuthPage(c, 'register', error, formData);
    }
}), async (c) => {
  const { username, password } = c.req.valid('form');

  // Check existing
  const existing = await db.select().from(users).where(eq(users.username, username)).get();
  if (existing) {
    return renderAuthPage(c, 'register', 'Username already taken', { username });
  }

  // Hash password
  const passwordHash = await Bun.password.hash(password);

  // Insert
  const result = await db.insert(users).values({ username, passwordHash }).returning();
  const user = result[0];

  if (!user) {
    return renderAuthPage(c, 'register', 'Failed to create user', { username });
  }

  // Session/JWT
  const token = await sign({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, SECRET);
  setCookie(c, 'auth_token', token, { httpOnly: true, path: '/' });

  return c.redirect('/admin/dashboard');
});

auth.post('/login', zValidator('form', registerSchema, async (result, c) => {
    if (!result.success) {
        const issue = result.error.issues?.[0] || result.error.errors?.[0];
        const error = issue?.message || 'Invalid input';
        const formData = await c.req.parseBody();
        return renderAuthPage(c, 'login', error, formData);
    }
}), async (c) => {
  const { username, password } = c.req.valid('form');

  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user) {
    return renderAuthPage(c, 'login', 'Invalid credentials', { username });
  }

  const valid = await Bun.password.verify(password, user.passwordHash);
  if (!valid) {
    return renderAuthPage(c, 'login', 'Invalid credentials', { username });
  }

  const token = await sign({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, SECRET);
  setCookie(c, 'auth_token', token, { httpOnly: true, path: '/' });

  return c.redirect('/admin/dashboard');
});

// GET /login page and /register page (HTML)
auth.get('/login', (c) => {
  return renderAuthPage(c, 'login');
});

auth.get('/register', (c) => {
    return renderAuthPage(c, 'register');
  });

export default auth;
