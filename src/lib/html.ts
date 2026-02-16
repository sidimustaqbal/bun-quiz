import { html } from 'hono/html';

export const Layout = (props: { title: string; children: any; user?: any; fullWidth?: boolean }) => html`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title} - Fun Quiz</title>
    <!-- Tailwind via CDN for simplicity in dev, or build step. Using CDN for speed and 'playful' feeling confirmation quickly -->
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
              sans: ['Comic Sans MS', 'cursive', 'sans-serif'], // Or a better Google Font
            }
          }
        }
      }
    </script>
    <style>
      body {
        font-family: 'Comic Sans MS', 'chalkboard', sans-serif; /* Fallback for playful font */
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
        <div>
          ${props.user ? html`
            <span class="mr-4">Hi, ${props.user.username}!</span>
            <a href="/auth/logout" class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded">Logout</a>
          ` : html`
            <a href="/auth/login" class="underline">Login</a>
          `}
        </div>
      </div>
    </nav>
    <main class="${props.fullWidth ? 'flex-grow' : 'container mx-auto px-4 flex-grow'}">
      ${props.children}
    </main>
  </body>
  </html>
`;
