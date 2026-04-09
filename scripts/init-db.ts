/**
 * Initialize MySQL tables only (without starting the bot)
 */
import 'dotenv/config';
import { initDatabase, closeDatabase } from '../src/database/connection.js';

async function main() {
  await initDatabase();
  await closeDatabase();
}

main();
