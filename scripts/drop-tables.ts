import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL || '');
  const tables = ['ai_usage_logs', 'dashboard_sessions', 'persona_settings', 'budgets', 'transactions', 'users'];
  for (const t of tables) {
    await conn.query('DROP TABLE IF EXISTS ' + t);
    console.log('Dropped:', t);
  }
  await conn.end();
  console.log('Done!');
}

main();
