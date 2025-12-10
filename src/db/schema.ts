import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Users (Hosts)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

// Quizzes
export const quizzes = sqliteTable('quizzes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hostId: integer('host_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

// Questions
export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quizId: integer('quiz_id').references(() => quizzes.id).notNull(),
  text: text('text').notNull(),
  imageUrl: text('image_url'),
  timeLimit: integer('time_limit').default(30), // seconds
});

// Options
export const options = sqliteTable('options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  text: text('text').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).default(false),
});

// Game Sessions
export const gameSessions = sqliteTable('game_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quizId: integer('quiz_id').references(() => quizzes.id).notNull(),
  pinCode: text('pin_code').unique().notNull(), // The game code
  status: text('status').default('WAITING'), // WAITING, ACTIVE, FINISHED
  currentQuestionIndex: integer('current_question_index').default(-1), // -1 = lobby
  startTime: integer('start_time', { mode: 'timestamp' }),
});

// Participants
export const participants = sqliteTable('participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').references(() => gameSessions.id).notNull(),
  name: text('name').notNull(),
  score: integer('score').default(0),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).default(new Date()),
});

// Answers
export const answers = sqliteTable('answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  participantId: integer('participant_id').references(() => participants.id).notNull(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  optionId: integer('option_id').references(() => options.id), // Nullable if they didn't answer? Or store wrong answer?
  timeTaken: integer('time_taken'), // ms taken to answer
  isCorrect: integer('is_correct', { mode: 'boolean' }).default(false),
});
