/**
 * ==========================================
 * 🔄 Migration Script: PostgreSQL → MySQL
 * ==========================================
 * Migrates data from the old Python Penny Bot (PostgreSQL)
 * to the new TypeScript Penny Bot (MySQL).
 *
 * Usage: npx tsx scripts/migrate-from-postgres.ts
 *
 * Old DB schema (PostgreSQL via SQLAlchemy):
 *   - users (UUID id, status)
 *   - telegram_accounts (telegram_user_id, first_name, username...)
 *   - user_settings (tone_preset, sarcasm_level, strictness_level...)
 *   - categories (slug, display_name, is_system)
 *   - expenses (amount_minor, currency, merchant, note, occurred_at, category_id...)
 *   - budgets (period_type, amount_minor, starts_on, is_active...)
 *
 * New DB schema (MySQL via Drizzle):
 *   - users (INT id, telegram_id, first_name...)
 *   - transactions (amount as VND float, description, category as string...)
 *   - budgets (period as 'week'|'month', amount as VND float...)
 *   - persona_settings (preset, sarcasm_level, seriousness_level...)
 */

import 'dotenv/config';
import pg from 'pg';
import mysql from 'mysql2/promise';

// =========================================
// Configuration
// =========================================
const PG_URL = 'postgresql://penny:NyvEfb9xzWD%2FdymU9kKtZYggfBQgdlfJ@160.22.123.174:5433/penny';
const MYSQL_URL = process.env.DATABASE_URL || '';

if (!MYSQL_URL) {
  console.error('❌ Missing DATABASE_URL in .env');
  process.exit(1);
}

// =========================================
// Preset mapping: old Python enum → new Vietnamese names
// =========================================
const PRESET_MAP: Record<string, string> = {
  'ban_than': 'bạn thân',
  'nhe_nhang': 'trợ lý', // closest match
  'thang_than': 'huấn luyện viên', // closest match
  'trung_lap': 'trợ lý',
};

// =========================================
// Period mapping
// =========================================
const PERIOD_MAP: Record<string, string> = {
  'daily': 'week', // daily doesn't exist in new schema, map to week
  'weekly': 'week',
  'monthly': 'month',
};

// =========================================
// Main Migration
// =========================================
async function main() {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║  🔄 PennyBot Migration               ║');
  console.log('  ║  PostgreSQL → MySQL                  ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');

  // --- Connect to PostgreSQL ---
  console.log('📡 Connecting to PostgreSQL (old DB)...');
  const pgClient = new pg.Client({ connectionString: PG_URL });
  await pgClient.connect();
  console.log('✅ PostgreSQL connected');

  // --- Connect to MySQL ---
  console.log('📡 Connecting to MySQL (new DB)...');
  const mysqlConn = await mysql.createConnection(MYSQL_URL);
  console.log('✅ MySQL connected');

  try {
    // =========================================
    // Step 1: Read data from PostgreSQL
    // =========================================
    console.log('\n📖 Reading data from PostgreSQL...');

    // Users + Telegram accounts
    const { rows: pgUsers } = await pgClient.query(`
      SELECT u.id as user_id, u.status, u.created_at,
             t.telegram_user_id, t.first_name, t.last_name, t.username
      FROM users u
      LEFT JOIN telegram_accounts t ON t.user_id = u.id
      WHERE u.status = 'active'
      ORDER BY u.created_at ASC
    `);
    console.log(`  👤 Users: ${pgUsers.length}`);

    // Categories (used to resolve expense category names)
    const { rows: pgCategories } = await pgClient.query(`
      SELECT id, slug, display_name FROM categories
    `);
    const categoryMap = new Map<string, string>();
    for (const cat of pgCategories) {
      categoryMap.set(cat.id, cat.display_name);
    }
    console.log(`  📂 Categories: ${pgCategories.length}`);

    // Expenses
    const { rows: pgExpenses } = await pgClient.query(`
      SELECT e.user_id, e.amount_minor, e.currency, e.merchant, e.note,
             e.occurred_at, e.source_type, e.status, e.category_id, e.created_at
      FROM expenses e
      WHERE e.status != 'deleted'
      ORDER BY e.occurred_at ASC
    `);
    console.log(`  💳 Expenses: ${pgExpenses.length}`);

    // Budgets
    const { rows: pgBudgets } = await pgClient.query(`
      SELECT b.user_id, b.period_type, b.amount_minor, b.currency,
             b.is_active, b.created_at
      FROM budgets b
      ORDER BY b.created_at ASC
    `);
    console.log(`  💰 Budgets: ${pgBudgets.length}`);

    // User settings (persona)
    const { rows: pgSettings } = await pgClient.query(`
      SELECT s.user_id, s.tone_preset, s.sarcasm_level, s.strictness_level,
             s.verbosity_level
      FROM user_settings s
    `);
    console.log(`  🎭 User settings: ${pgSettings.length}`);

    // =========================================
    // Step 2: Insert into MySQL
    // =========================================
    console.log('\n📝 Migrating to MySQL...');

    // Track old UUID → new INT ID mapping
    const userIdMap = new Map<string, number>(); // old UUID → new INT

    // --- Migrate Users ---
    let userCount = 0;
    for (const u of pgUsers) {
      if (!u.telegram_user_id) {
        console.log(`  ⚠️  Skipping user ${u.user_id} (no telegram account)`);
        continue;
      }

      // Check if user already exists (by telegram_id)
      const [existing] = await mysqlConn.query(
        'SELECT id FROM users WHERE telegram_id = ?',
        [u.telegram_user_id]
      ) as any[];

      if (existing.length > 0) {
        userIdMap.set(u.user_id, existing[0].id);
        console.log(`  ⏭️  User ${u.first_name || u.telegram_user_id} already exists (id=${existing[0].id})`);
        continue;
      }

      const [result] = await mysqlConn.query(
        `INSERT INTO users (telegram_id, first_name, last_name, username, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          u.telegram_user_id,
          u.first_name || '',
          u.last_name || '',
          u.username || '',
          u.created_at,
        ]
      ) as any[];

      userIdMap.set(u.user_id, result.insertId);
      userCount++;
    }
    console.log(`  ✅ Users migrated: ${userCount} new, ${pgUsers.length - userCount} existing`);

    // --- Migrate Persona Settings ---
    let personaCount = 0;
    for (const s of pgSettings) {
      const newUserId = userIdMap.get(s.user_id);
      if (!newUserId) continue;

      // Check if persona already exists
      const [existing] = await mysqlConn.query(
        'SELECT id FROM persona_settings WHERE user_id = ?',
        [newUserId]
      ) as any[];

      if (existing.length > 0) continue;

      const preset = PRESET_MAP[s.tone_preset] || 'bạn thân';

      await mysqlConn.query(
        `INSERT INTO persona_settings (user_id, preset, sarcasm_level, seriousness_level, frugality_level, emoji_level)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          preset,
          Math.min(10, (s.sarcasm_level || 2) * 2), // Scale 0-5 → 0-10
          Math.min(10, (s.strictness_level || 2) * 2),
          5, // default frugality
          5, // default emoji
        ]
      );
      personaCount++;
    }
    console.log(`  ✅ Persona settings migrated: ${personaCount}`);

    // --- Migrate Expenses → Transactions ---
    let txCount = 0;
    let txSkipped = 0;
    for (const e of pgExpenses) {
      const newUserId = userIdMap.get(e.user_id);
      if (!newUserId) {
        txSkipped++;
        continue;
      }

      // Convert amount: amount_minor is in VND (smallest unit, no cents for VND)
      const amount = e.amount_minor; // VND is already in whole units

      // Build description from merchant + note
      const parts: string[] = [];
      if (e.merchant) parts.push(e.merchant);
      if (e.note) parts.push(e.note);
      const description = parts.join(': ') || 'Chi tiêu';

      // Resolve category
      const category = categoryMap.get(e.category_id) || 'Khác';

      // Map source type
      const sourceMap: Record<string, string> = {
        'text': 'text',
        'voice': 'text',
        'receipt': 'image',
      };

      await mysqlConn.query(
        `INSERT INTO transactions (user_id, amount, description, category, raw_input, source, transaction_date, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          amount,
          description,
          category,
          '', // raw_input not available
          sourceMap[e.source_type] || 'text',
          e.occurred_at,
          e.status === 'confirmed' ? 'confirmed' : 'pending',
          e.created_at,
        ]
      );
      txCount++;
    }
    console.log(`  ✅ Transactions migrated: ${txCount} (skipped ${txSkipped} orphaned)`);

    // --- Migrate Budgets ---
    let budgetCount = 0;
    for (const b of pgBudgets) {
      const newUserId = userIdMap.get(b.user_id);
      if (!newUserId) continue;

      const period = PERIOD_MAP[b.period_type] || 'month';
      const amount = b.amount_minor; // VND whole units

      await mysqlConn.query(
        `INSERT INTO budgets (user_id, period, amount, is_active, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          newUserId,
          period,
          amount,
          b.is_active ? 1 : 0,
          b.created_at,
        ]
      );
      budgetCount++;
    }
    console.log(`  ✅ Budgets migrated: ${budgetCount}`);

    // =========================================
    // Summary
    // =========================================
    console.log('\n');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║  ✅ Migration Complete!               ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
    console.log(`  📊 Summary:`);
    console.log(`     👤 Users:        ${userCount} migrated`);
    console.log(`     🎭 Personas:     ${personaCount} migrated`);
    console.log(`     💳 Transactions: ${txCount} migrated`);
    console.log(`     💰 Budgets:      ${budgetCount} migrated`);
    console.log('');

  } catch (error) {
    console.error('❌ Migration error:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  } finally {
    await pgClient.end();
    await mysqlConn.end();
    console.log('🔌 Connections closed');
  }
}

main();
