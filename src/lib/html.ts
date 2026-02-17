import { html } from 'hono/html';
import type { Lang } from './i18n';

export const Layout = (props: { title: string; children: any; user?: any; fullWidth?: boolean; lang?: Lang }) => {
  const lang = props.lang || 'id';
  const hiLabel = lang === 'en' ? 'Hi' : 'Hai';
  const logoutLabel = lang === 'en' ? 'Logout' : 'Keluar';
  const loginLabel = lang === 'en' ? 'Login' : 'Masuk';

  const idActive = lang === 'id';
  const enActive = lang === 'en';
  const activeCls = 'bg-white text-purple-700 shadow-md';
  const inactiveCls = 'bg-transparent text-white/70 hover:bg-white/20';

  return html`
  <!DOCTYPE html>
  <html lang="${lang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title} - Fun Quiz</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="//unpkg.com/alpinejs" defer></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              primary: '#FF6B6B',
              secondary: '#4ECDC4',
              accent: '#FFE66D',
              dark: '#292F36',
            },
            fontFamily: {
              sans: ['Comic Sans MS', 'cursive', 'sans-serif'],
            }
          }
        }
      }
    </script>
    <style>
      body {
        font-family: 'Comic Sans MS', 'chalkboard', sans-serif;
      }
      .btn-primary {
        @apply bg-primary text-white font-bold py-2 px-4 rounded-full shadow-lg transform transition hover:scale-105 hover:rotate-1;
      }
      .card {
        @apply bg-white rounded-xl shadow-xl border-4 border-dark p-6;
      }
    </style>
  </head>
  <body class="bg-yellow-50 text-dark min-h-screen flex flex-col">
    <nav class="bg-purple-600 text-white p-4 shadow-lg ${props.fullWidth ? '' : 'mb-8'} relative z-50">
      <div class="container mx-auto flex justify-between items-center">
        <a href="${props.user ? '/admin/dashboard' : '/'}" class="text-3xl font-extrabold tracking-wider hover:animate-pulse">🎉 FunQuiz</a>
        <div class="flex items-center gap-3">
          <div class="flex items-center bg-white/10 rounded-full p-0.5 backdrop-blur-sm">
            <button onclick="switchLang('id')" class="flex items-center gap-1 text-sm font-bold py-1.5 px-3 rounded-full transition-all duration-200 ${idActive ? activeCls : inactiveCls}">
              🇮🇩 ID
            </button>
            <button onclick="switchLang('en')" class="flex items-center gap-1 text-sm font-bold py-1.5 px-3 rounded-full transition-all duration-200 ${enActive ? activeCls : inactiveCls}">
              🇬🇧 EN
            </button>
          </div>
          ${props.user ? html`
            <span class="mr-2">${hiLabel}, ${props.user.username}!</span>
            <a href="/auth/logout" class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded">${logoutLabel}</a>
          ` : html`
            <a href="/auth/login" class="underline">${loginLabel}</a>
          `}
        </div>
      </div>
    </nav>
    <main class="${props.fullWidth ? 'flex-grow' : 'container mx-auto px-4 flex-grow'}">
      ${props.children}
    </main>
    <script>
      function switchLang(lang) {
        document.cookie = 'lang=' + lang + ';path=/;max-age=' + (365*24*60*60);
        window.location.reload();
      }
    </script>
  </body>
  </html>
`;
};
