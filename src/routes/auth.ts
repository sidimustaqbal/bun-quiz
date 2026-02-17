import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import { getLang, getT } from '../lib/i18n';

const auth = new Hono();
const SECRET = 'SUPER_SECRET_KEY_CHANGE_ME'; // TODO: env var

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Helper to render auth pages with errors
const renderAuthPage = (c: any, type: 'login' | 'register', error?: string, formData?: any) => {
  const { Layout } = require('../lib/html');
  const { html } = require('hono/html');
  
  const lang = getLang(c);
  const t = getT(lang);

  const isLogin = type === 'login';
  const title = isLogin ? t('auth.login') : t('auth.register');
  const action = isLogin ? '/auth/login' : '/auth/register';
  const altLink = isLogin ? '/auth/register' : '/auth/login';
  const altText = isLogin ? t('auth.need_account') : t('auth.have_account');
  const heading = isLogin ? t('auth.welcome_back') : t('auth.join_fun');
  const subtext = isLogin ? t('auth.login_desc') : t('auth.register_desc');
  
  return c.html(Layout({
    title,
    lang,
    children: html`
    <div class="flex items-center justify-center min-h-[80vh]">
      <div class="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl border-4 border-${isLogin ? 'secondary' : 'primary'} transform hover:scale-[1.01] transition duration-300">
        <div class="text-center">
            <h2 class="text-4xl font-extrabold text-${isLogin ? 'purple' : 'red'}-600 mb-2">${heading}</h2>
            <p class="text-gray-500">${subtext}</p>
        </div>
        
        ${error ? html`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert"><strong class="font-bold">${t('auth.error')}</strong> <span class="block sm:inline">${error}</span></div>` : ''}

        <form action="${action}" method="post" class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2" for="username">${t('auth.username')}</label>
              <input type="text" placeholder="${t('auth.username')}" name="username" value="${formData?.username || ''}" required 
                class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-${isLogin ? 'purple' : 'red'}-500 focus:ring-4 focus:ring-${isLogin ? 'purple' : 'red'}-200 transition duration-200">
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2" for="password">${t('auth.password')}</label>
              <div class="relative" x-data="{ show: false }">
                <input :type="show ? 'text' : 'password'" placeholder="${t('auth.password')}" name="password" required
                  class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-${isLogin ? 'purple' : 'red'}-500 focus:ring-4 focus:ring-${isLogin ? 'purple' : 'red'}-200 transition duration-200">
                <button type="button" @click="show = !show" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                  <svg x-show="!show" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg x-show="show" style="display: none;" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
            </div>
            ${!isLogin ? html`
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2" for="confirmPassword">${t('auth.confirm_password')}</label>
              <div class="relative" x-data="{ show: false }">
                <input :type="show ? 'text' : 'password'" placeholder="${t('auth.confirm_password')}" name="confirmPassword" required
                  class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-${isLogin ? 'purple' : 'red'}-500 focus:ring-4 focus:ring-${isLogin ? 'purple' : 'red'}-200 transition duration-200">
                <button type="button" @click="show = !show" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                  <svg x-show="!show" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg x-show="show" style="display: none;" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
            </div>
            ` : ''}
            
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
        // Safe error access (Zod v4 uses 'issues' only)
        const issue = result.error.issues?.[0];
        const error = issue?.message || 'Invalid input';
        
        // Repulate form data (safeParse doesn't return data on error, need raw body)
        const formData = await c.req.parseBody();
        return renderAuthPage(c, 'register', error, formData);
    }
}), async (c) => {
  const { username, password } = c.req.valid('form');
  const lang = getLang(c);
  const t = getT(lang);

  // Check existing
  const existing = await db.select().from(users).where(eq(users.username, username)).get();
  if (existing) {
    return renderAuthPage(c, 'register', t('auth.username_taken'), { username });
  }

  // Hash password
  const passwordHash = await Bun.password.hash(password);

  // Insert
  const result = await db.insert(users).values({ username, passwordHash }).returning();
  const user = result[0];

  if (!user) {
    return renderAuthPage(c, 'register', t('auth.failed_create'), { username });
  }

  // Session/JWT
  const token = await sign({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, SECRET);
  setCookie(c, 'auth_token', token, { httpOnly: true, path: '/' });

  return c.redirect('/admin/dashboard');
});

auth.post('/login', zValidator('form', z.object({
    username: z.string(),
    password: z.string()
}), async (result, c) => {
    if (!result.success) {
        // Zod v4 uses 'issues' only
        const issue = result.error.issues?.[0];
        const error = issue?.message || 'Invalid input';
        const formData = await c.req.parseBody();
        return renderAuthPage(c, 'login', error, formData);
    }
}), async (c) => {
  const { username, password } = c.req.valid('form');
  const lang = getLang(c);
  const t = getT(lang);

  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user) {
    return renderAuthPage(c, 'login', t('auth.invalid_credentials'), { username });
  }

  const valid = await Bun.password.verify(password, user.passwordHash);
  if (!valid) {
    return renderAuthPage(c, 'login', t('auth.invalid_credentials'), { username });
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

auth.get('/logout', (c) => {
  setCookie(c, 'auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return c.redirect('/auth/login');
});

export default auth;
