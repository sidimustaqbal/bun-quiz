// Simple dual-language system (English / Bahasa Indonesia)

export type Lang = 'en' | 'id';

const translations: Record<string, Record<Lang, string>> = {
  // ===================== NAVBAR / LAYOUT =====================
  'nav.hi': { en: 'Hi', id: 'Hai' },
  'nav.logout': { en: 'Logout', id: 'Keluar' },
  'nav.login': { en: 'Login', id: 'Masuk' },

  // ===================== AUTH =====================
  'auth.login': { en: 'Login', id: 'Masuk' },
  'auth.register': { en: 'Register', id: 'Daftar' },
  'auth.welcome_back': { en: 'Welcome Back!', id: 'Selamat Datang Kembali!' },
  'auth.join_fun': { en: 'Join the Fun!', id: 'Ayo Bergabung!' },
  'auth.login_desc': { en: 'Login to host your quiz', id: 'Masuk untuk mengelola kuis' },
  'auth.register_desc': { en: 'Create an account to host quizzes', id: 'Buat akun untuk mengelola kuis' },
  'auth.username': { en: 'Username', id: 'Nama Pengguna' },
  'auth.password': { en: 'Password', id: 'Kata Sandi' },
  'auth.confirm_password': { en: 'Confirm Password', id: 'Konfirmasi Kata Sandi' },
  'auth.need_account': { en: 'Need an account? Register here', id: 'Belum punya akun? Daftar di sini' },
  'auth.have_account': { en: 'Already have an account? Login', id: 'Sudah punya akun? Masuk' },
  'auth.error': { en: 'Error!', id: 'Kesalahan!' },
  'auth.username_taken': { en: 'Username already taken', id: 'Nama pengguna sudah digunakan' },
  'auth.invalid_credentials': { en: 'Invalid credentials', id: 'Kredensial tidak valid' },
  'auth.failed_create': { en: 'Failed to create user', id: 'Gagal membuat pengguna' },

  // ===================== GAME / JOIN =====================
  'game.join_title': { en: 'Join Game', id: 'Gabung Game' },
  'game.join_party': { en: 'Join the Party', id: 'Gabung Sekarang' },
  'game.pin_label': { en: 'Game PIN', id: 'PIN Game' },
  'game.nickname_label': { en: 'Nickname', id: 'Nama Panggilan' },
  'game.enter_name': { en: 'Enter your name', id: 'Masukkan nama kamu' },
  'game.enter_game': { en: 'Enter Game 🚀', id: 'Masuk Game 🚀' },
  'game.ready': { en: 'Ready to play?', id: 'Siap bermain?' },

  // Game not found
  'game.not_found_title': { en: 'Game Not Found', id: 'Game Tidak Ditemukan' },
  'game.not_found_heading': { en: 'Oops! Game Not Found', id: 'Ups! Game Tidak Ditemukan' },
  'game.not_found_desc': { en: "We couldn't find a game with that PIN. Double check and try again!", id: 'Kami tidak menemukan game dengan PIN tersebut. Periksa kembali dan coba lagi!' },
  'game.back_join': { en: 'Back to Join', id: 'Kembali' },

  // Game started / too late
  'game.started_title': { en: 'Game Started', id: 'Game Sudah Dimulai' },
  'game.too_late': { en: 'Too Late!', id: 'Terlambat!' },
  'game.too_late_desc': { en: "Wait, this game has already started or finished. You can't join right now!", id: 'Game ini sudah dimulai atau selesai. Kamu tidak bisa bergabung sekarang!' },
  'game.join_another': { en: 'Join Another?', id: 'Gabung yang Lain?' },

  // Lobby
  'game.lobby_title': { en: 'Lobby', id: 'Ruang Tunggu' },
  'game.youre_in': { en: "You're In!", id: 'Kamu Masuk!' },
  'game.your_nickname': { en: 'Your Nickname', id: 'Nama Panggilan Kamu' },
  'game.waiting_host': { en: 'Waiting for host...', id: 'Menunggu host...' },
  'game.dont_close': { en: 'Do not close this window', id: 'Jangan tutup jendela ini' },

  // Play
  'game.play_title': { en: 'Play!', id: 'Main!' },
  'game.score': { en: 'Score', id: 'Skor' },
  'game.eyes_on_screen': { en: 'Eyes on the Screen!', id: 'Perhatikan Layar!' },
  'game.waiting_question': { en: 'Waiting for the next question...', id: 'Menunggu pertanyaan berikutnya...' },
  'game.question_live': { en: 'Question Live', id: 'Pertanyaan Aktif' },
  'game.look_up': { en: 'Look up! 👆', id: 'Lihat ke atas! 👆' },
  'game.answer_sent': { en: 'Answer Sent!', id: 'Jawaban Terkirim!' },
  'game.fingers_crossed': { en: 'Fingers crossed... 🤞', id: 'Semoga benar... 🤞' },
  'game.your_score': { en: 'Your Score', id: 'Skor Kamu' },
  'game.game_over': { en: 'Game Over!', id: 'Game Selesai!' },
  'game.final_score': { en: 'Your Final Score', id: 'Skor Akhir Kamu' },
  'game.leave': { en: 'Leave Game 🏠', id: 'Keluar Game 🏠' },

  // ===================== ADMIN / DASHBOARD =====================
  'admin.my_quizzes': { en: 'My Quizzes', id: 'Kuis Saya' },
  'admin.manage_desc': { en: 'Manage your games or create a new challenge!', id: 'Kelola game atau buat tantangan baru!' },
  'admin.create_quiz': { en: 'Create New Quiz', id: 'Buat Kuis Baru' },
  'admin.edit': { en: 'Edit', id: 'Edit' },
  'admin.delete': { en: 'Delete', id: 'Hapus' },
  'admin.host_game': { en: 'Host Game', id: 'Mulai Game' },
  'admin.no_quizzes': { en: 'No quizzes yet!', id: 'Belum ada kuis!' },
  'admin.no_quizzes_desc': { en: 'Create your first quiz to get the party started.', id: 'Buat kuis pertamamu untuk memulai.' },
  'admin.no_description': { en: 'No description provided.', id: 'Tidak ada deskripsi.' },
  'admin.quiz_badge': { en: 'Quiz', id: 'Kuis' },
  'admin.delete_confirm': { en: 'Are you sure you want to delete this quiz?', id: 'Apakah kamu yakin ingin menghapus kuis ini?' },

  // Create Quiz
  'admin.new_quiz_title': { en: 'New Quiz', id: 'Kuis Baru' },
  'admin.create_new_quiz': { en: 'Create New Quiz', id: 'Buat Kuis Baru' },
  'admin.quiz_title_label': { en: 'Quiz Title', id: 'Judul Kuis' },
  'admin.quiz_title_placeholder': { en: 'e.g. Science Trivia 2024', id: 'contoh: Trivia Sains 2024' },
  'admin.catchy_title': { en: 'Give your new challenge a catchy title!', id: 'Berikan judul yang menarik!' },
  'admin.description_label': { en: 'Description', id: 'Deskripsi' },
  'admin.description_optional': { en: '(Optional)', id: '(Opsional)' },
  'admin.description_placeholder': { en: 'What is this quiz about?', id: 'Tentang apa kuis ini?' },
  'admin.game_pacing': { en: 'Game Pacing', id: 'Mode Permainan' },
  'admin.host_controlled': { en: 'Host Controlled', id: 'Dikendalikan Host' },
  'admin.host_controlled_desc': { en: 'You control when to move to the next question. Updates for everyone at once.', id: 'Kamu mengontrol kapan pindah ke pertanyaan berikutnya. Semua pemain maju bersamaan.' },
  'admin.self_paced': { en: 'Self Paced', id: 'Kecepatan Sendiri' },
  'admin.self_paced_desc': { en: 'Participants answer at their own speed. Ideal for assignments or asynchronous play.', id: 'Peserta menjawab dengan kecepatan mereka sendiri. Ideal untuk tugas atau permainan asinkron.' },
  'admin.cancel': { en: 'Cancel', id: 'Batal' },
  'admin.create_quiz_btn': { en: 'Create Quiz', id: 'Buat Kuis' },

  // Edit Quiz
  'admin.editing_quiz': { en: 'Editing Quiz', id: 'Edit Kuis' },
  'admin.add_question': { en: 'Add Question', id: 'Tambah Pertanyaan' },
  'admin.delete_question_confirm': { en: 'Are you sure you want to delete this question?', id: 'Apakah kamu yakin ingin menghapus pertanyaan ini?' },
  'admin.empty_questions': { en: "It's quiet here...", id: 'Masih kosong...' },
  'admin.empty_questions_desc': { en: 'Add your first question to build this quiz!', id: 'Tambahkan pertanyaan pertama untuk membangun kuis ini!' },

  // Add Question
  'admin.new_question_title': { en: 'Add Question', id: 'Tambah Pertanyaan' },
  'admin.add_new_question': { en: 'Add New Question', id: 'Tambah Pertanyaan Baru' },
  'admin.question_text': { en: 'Question Text', id: 'Teks Pertanyaan' },
  'admin.question_placeholder': { en: 'e.g. What is the capital of France?', id: 'contoh: Apa ibukota Prancis?' },
  'admin.time_limit': { en: 'Time Limit', id: 'Batas Waktu' },
  'admin.answer_options': { en: 'Answer Options', id: 'Pilihan Jawaban' },
  'admin.mark_correct': { en: '(Mark the correct one)', id: '(Tandai yang benar)' },
  'admin.option_a': { en: 'Option A (Red)', id: 'Pilihan A (Merah)' },
  'admin.option_b': { en: 'Option B (Blue)', id: 'Pilihan B (Biru)' },
  'admin.option_c': { en: 'Option C (Yellow)', id: 'Pilihan C (Kuning)' },
  'admin.option_d': { en: 'Option D (Green)', id: 'Pilihan D (Hijau)' },
  'admin.type_answer': { en: 'Type answer here...', id: 'Ketik jawaban di sini...' },
  'admin.save_question': { en: 'Save Question', id: 'Simpan Pertanyaan' },

  // Game Controller / Host
  'admin.game_controller': { en: 'Game Controller', id: 'Kontrol Game' },
  'admin.join_at': { en: 'Join at', id: 'Gabung di' },
  'admin.with_pin': { en: 'with PIN:', id: 'dengan PIN:' },
  'admin.waiting_players': { en: 'Waiting for players...', id: 'Menunggu pemain...' },
  'admin.joined': { en: 'Joined', id: 'Bergabung' },
  'admin.waiting_crowd': { en: 'Music is playing... waiting for the crowd! 🎵', id: 'Musik bermain... menunggu peserta! 🎵' },
  'admin.start_game': { en: 'Start Game! 🚀', id: 'Mulai Game! 🚀' },
  'admin.exit_game': { en: 'Exit Game', id: 'Keluar Game' },
  'admin.live_game': { en: 'Live Game', id: 'Game Berlangsung' },
  'admin.current_question': { en: 'Current Question', id: 'Pertanyaan Saat Ini' },
  'admin.get_ready': { en: 'Get Ready...', id: 'Bersiap...' },
  'admin.answers': { en: 'Answers', id: 'Jawaban' },
  'admin.players': { en: 'Players', id: 'Pemain' },
  'admin.next_question': { en: 'Next Question ➡️', id: 'Pertanyaan Berikutnya ➡️' },
  'admin.live_progress': { en: 'Live Progress', id: 'Progres Langsung' },
  'admin.playing': { en: 'Playing...', id: 'Bermain...' },
  'admin.end_game': { en: 'End Game & Show Results 🏁', id: 'Akhiri Game & Tampilkan Hasil 🏁' },
  'admin.final_results': { en: '🏆 Final Results 🏆', id: '🏆 Hasil Akhir 🏆' },
  'admin.champions_crowned': { en: 'The champions have been crowned!', id: 'Para juara telah ditentukan!' },
  'admin.points': { en: 'Points', id: 'Poin' },
  'admin.back_dashboard': { en: 'Back to Dashboard', id: 'Kembali ke Dashboard' },
  'admin.finished': { en: 'Finished! 🏆', id: 'Selesai! 🏆' },

  // Language
  'lang.switch': { en: '🇮🇩 Bahasa', id: '🇬🇧 English' },
};

/**
 * Get a translation function for the given language.
 * Usage: const t = getT('id'); t('auth.login') // => 'Masuk'
 */
export function getT(lang: Lang) {
  return (key: string, fallback?: string): string => {
    const entry = translations[key];
    if (!entry) return fallback || key;
    return entry[lang] || entry['en'] || fallback || key;
  };
}

/**
 * Read the language preference from a Hono context (cookie).
 * Defaults to 'en'.
 */
export function getLang(c: any): Lang {
  const { getCookie } = require('hono/cookie');
  const lang = getCookie(c, 'lang');
  if (lang === 'en') return 'en';
  return 'id'; // Default to Bahasa Indonesia
}
