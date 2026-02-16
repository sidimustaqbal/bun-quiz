import { Database } from 'bun:sqlite';
const sqlite = new Database('quiz.db');

try {
    console.log('Adding column "mode" to "quizzes" table...');
    sqlite.run("ALTER TABLE quizzes ADD COLUMN mode TEXT DEFAULT 'HOST'");
    console.log('Success.');
} catch (e: any) {
    console.log('Note: Column "mode" maybe already exists or error:', e.message);
}

try {
    console.log('Adding column "current_question_index" to "participants" table...');
    sqlite.run("ALTER TABLE participants ADD COLUMN current_question_index INTEGER DEFAULT -1");
    console.log('Success.');
} catch (e: any) {
    console.log('Note: Column "current_question_index" maybe already exists or error:', e.message);
}

console.log('Migration attempt finished.');
sqlite.close();
