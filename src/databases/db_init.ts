import SQLite from 'better-sqlite3'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = process.env.DATABASE_URL ?? dirname(__filename);

export const greeterDB = new SQLite(join(__dirname, './greeter.db'));

export function initDatabase(): void {

  greeterDB.pragma('journal_mode = WAL');
  greeterDB.prepare(`
    CREATE TABLE IF NOT EXISTS greeter (
      guildId CHAR(20) PRIMARY KEY,
      channelId CHAR(20),
      messageId CHAR(20),
      embedData TEXT,
      programData TEXT,
      factionData TEXT
    )
  `).run();

  console.log('SQLite tables prepared!')
}
