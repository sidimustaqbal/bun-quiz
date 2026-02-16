import { Database } from 'bun:sqlite';

const db = new Database('quiz.db');
const tables = ['quizzes', 'participants', 'game_sessions']; // checking game_sessions too just in case

for (const table of tables) {
    console.log(`--- Schema for ${table} ---`);
    const schema = db.query(`PRAGMA table_info(${table})`).all();
    const columns = schema.map((col: any) => `${col.name} (${col.type})`);
    console.log(columns.join(', '));
}

db.close();
