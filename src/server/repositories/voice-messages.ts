import { Pool } from "pg";

declare global {
  var marsvidyaPgPool: Pool | undefined;
  var marsvidyaVoiceMessagesReady: Promise<void> | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Database is not configured.");
  const rootCertificate = process.env.DATABASE_SSL_CA_BASE64;
  if (!rootCertificate) throw new Error("Database SSL certificate is not configured.");
  globalThis.marsvidyaPgPool ??= new Pool({
    connectionString,
    ssl: { rejectUnauthorized: true, ca: Buffer.from(rootCertificate, "base64").toString("utf8") },
    max: 5,
  });
  return globalThis.marsvidyaPgPool;
}

async function ensureVoiceMessagesTable(): Promise<void> {
  globalThis.marsvidyaVoiceMessagesReady ??= getPool().query(`
    CREATE TABLE IF NOT EXISTS marsvidya_voice_messages (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      session_id UUID NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS marsvidya_voice_messages_session_created_idx
      ON marsvidya_voice_messages (session_id, created_at, id);
  `).then(() => undefined).catch((error: unknown) => {
    globalThis.marsvidyaVoiceMessagesReady = undefined;
    throw error;
  });
  await globalThis.marsvidyaVoiceMessagesReady;
}

export interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
}

export async function saveVoiceMessage(sessionId: string, message: VoiceMessage): Promise<void> {
  await ensureVoiceMessagesTable();
  await getPool().query(
    "INSERT INTO marsvidya_voice_messages (session_id, role, content) VALUES ($1, $2, $3)",
    [sessionId, message.role, message.content],
  );
}

export async function getRecentVoiceMessages(sessionId: string, limit = 28): Promise<VoiceMessage[]> {
  await ensureVoiceMessagesTable();
  const result = await getPool().query<VoiceMessage>(
    "SELECT role, content FROM marsvidya_voice_messages WHERE session_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2",
    [sessionId, limit],
  );
  return result.rows.reverse();
}
