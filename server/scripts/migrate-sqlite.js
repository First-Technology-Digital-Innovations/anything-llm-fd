const path = require("path");
const Database = require("better-sqlite3");
const { PrismaClient, Prisma } = require("@prisma/client");

const SQLITE_PATH = path.resolve(__dirname, "../anythingllm.db");

// Topologically ordered — parents before children
const ORDER = [
  "api_keys", "system_settings", "event_logs", "document_vectors",
  "external_communication_connectors", "cache_data",
  "users", "workspaces",
  "recovery_codes", "password_reset_tokens", "invites",
  "workspace_documents", "workspace_users",
  "workspace_suggested_messages", "workspace_threads",
  "workspace_chats", "workspace_agent_invocations",
  "embed_configs", "slash_command_presets",
  "browser_extension_api_keys", "temporary_auth_tokens",
  "system_prompt_variables", "prompt_history",
  "desktop_mobile_devices", "workspace_parsed_files",
  "embed_chats", "document_sync_queues", "document_sync_executions",
];

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

function sqliteHasTable(name) {
  const row = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name);
  return !!row;
}

function fieldTypesFor(modelName) {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
  if (!model) throw new Error(`Model ${modelName} not in Prisma schema`);
  return Object.fromEntries(
    model.fields.filter((f) => !f.relationName).map((f) => [f.name, f.type])
  );
}

function convertRow(row, types) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) { out[k] = null; continue; }
    const t = types[k];
    if (t === "DateTime") out[k] = new Date(typeof v === "number" ? v : Date.parse(v));
    else if (t === "Boolean") out[k] = v === 1 || v === true || v === "1";
    else out[k] = v;
  }
  return out;
}

async function main() {
  for (const name of ORDER) {
    if (!sqliteHasTable(name)) { console.log(`${name}: SKIP (not in SQLite)`); continue; }
    const types = fieldTypesFor(name);
    const rows = sqlite.prepare(`SELECT * FROM "${name}"`).all();
    if (rows.length === 0) { console.log(`${name}: 0`); continue; }
    const data = rows.map((r) => convertRow(r, types));
    await prisma[name].createMany({ data, skipDuplicates: true });
    console.log(`${name}: ${rows.length}`);
  }

  // Reset sequences so the next insert from the app doesn't collide
  for (const name of ORDER) {
    try {
      await prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${name}"', 'id'),
          GREATEST((SELECT COALESCE(MAX(id), 0) FROM "${name}"), 1)
        )
      `);
    } catch (e) {
      // table has no 'id' serial (shouldn't happen in this schema, but safe)
    }
  }

  await prisma.$disconnect();
  sqlite.close();
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });