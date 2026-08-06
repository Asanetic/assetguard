#!/usr/bin/env node
/**
 * Terminal DB CLI — single file, no setup required.
 * Auto-installs mysql2 if missing. Defaults to root/blank password/localhost
 * unless overridden by a .env file (DB_HOST, DB_USER, DB_PASS, DB_NAME).
 *
 * Scope: table/column structure + generating schema.js. This tool builds
 * UI/API scaffolding — it does NOT insert/select/update/delete row data.
 *
 * Usage:
 *   node db-cli.js
 *   -> interactive menu: create table, add/drop column, list columns,
 *      build schema.js from an existing table
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/* ================= AUTO-INSTALL MISSING PACKAGES ================= */

function ensurePackage(pkgName) {
  try {
    return require(pkgName);
  } catch {
    console.log(`📦 "${pkgName}" not found — installing...`);
    execSync(`npm install ${pkgName} --save`, { stdio: 'inherit', cwd: __dirname });
    return require(pkgName);
  }
}

const mysql = ensurePackage('mysql2/promise');

/* ================= LOAD .env (no dotenv dependency needed) ================= */

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        env[match[1]] = (match[2] || '').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return env;
}

// Diagnostic: show exactly where we're looking, and flag common Windows gotchas
// (a second db-cli.js elsewhere, or a ".env" that actually saved as ".env.txt").
function diagnoseEnv() {
  const envPath = path.join(__dirname, '.env');
  const found = fs.existsSync(envPath);
  console.log(`📄 .env expected at: ${envPath}`);
  console.log(`   ${found ? '✅ found' : '❌ not found'}`);

  if (!found) {
    const dirFiles = fs.readdirSync(__dirname);
    const suspects = dirFiles.filter((f) => f.toLowerCase().startsWith('.env') || f.toLowerCase() === 'env.txt');
    if (suspects.length > 0) {
      console.log(`   ⚠️  Found similarly-named file(s) instead: ${suspects.join(', ')}`);
      console.log(`      If one of these is "env.txt" or ".env.txt", rename it to exactly ".env" (no extra extension).`);
    } else {
      console.log(`   ℹ️  No .env-like file in this folder at all. Using built-in defaults (root / blank password / localhost).`);
      console.log(`      If you edited .env before, it may be next to a DIFFERENT copy of db-cli.js. Check for other db-cli.js files on your system.`);
    }
  }
}

const env = loadEnv();

const DB_CONFIG = {
  host: env.DB_HOST || 'localhost',
  user: env.DB_USER || 'root',
  password: env.DB_PASS || '',
  database: env.DB_NAME || path.basename(__dirname), // defaults to current folder name
};

/* ================= TYPE MAP ================= */

const TYPE_MAP = {
  text: 'VARCHAR(255)',
  tel: 'VARCHAR(20)',
  email: 'VARCHAR(255)',
  textarea: 'TEXT',
  money: 'DECIMAL(12,2)',
  number: 'INT',
  select: 'VARCHAR(100)',
  date: 'DATE',
  datetime: 'DATETIME',
  boolean: 'TINYINT(1)',
};
const TYPE_CHOICES = Object.keys(TYPE_MAP);

/* ================= SMART FIELD DETECTION (schema.js generation only) =================
 * Name-pattern rules for turning a raw DB column into a rich schema field —
 * same "SHOW COLUMNS + string matching" philosophy as the old PHP
 * SmartPageLayoutInit(), just producing the JS schema field shape instead.
 * Tune these lists, not the logic below, when a rule misfires on a table.
 */

const SMART_RULES = {
  sensitive: [/password/i, /pass_?hash/i, /secret/i, /token/i, /api_?key/i],
  image: [/image/i, /photo/i, /logo/i, /avatar/i],
  datetime: [/created_at/i, /updated_at/i, /created_on/i, /updated_on/i, /_date$/i, /^date_/i, /_time$/i],
  textarea: [/description/i, /notes?$/i, /message/i, /remark/i, /address/i],
  money: [/^latitude$/i, /^longitude$/i, /_lat$/i, /_lng$/i, /_amount$/i, /_price$/i, /_cost$/i, /_balance$/i, /_total$/i],
  groupedSelect: [/^country$/i, /^county$/i, /^town$/i, /^region$/i, /^status$/i, /^category$/i, /^cluster$/i, /_company$/i, /^vendor$/i, /_vendor$/i],
  computedSum: [/^total_/i, /_count$/i, /_sum$/i],
  title: [/_name$/i, /^name$/i, /_code$/i, /^code$/i],
  required: /_name$|^name$/i,
};

function matchesAny(str, patterns) {
  return patterns.some((p) => p.test(str));
}

/**
 * Classifies one DB column into a schema field descriptor, or returns null
 * if the column should be dropped entirely (sensitive data).
 * `apiBase` is threaded through so groupedSelect fields can point their
 * endpoint at this module's own list API, same as the sites schema does.
 */
function classifySmartField(col, apiBase) {
  const name = col.Field;
  if (matchesAny(name, SMART_RULES.sensitive)) return null;

  const field = { key: name, label: toLabel(name), type: sqlTypeToFieldType(col.Type) };

  if (matchesAny(name, SMART_RULES.image)) {
    field.type = 'image';
  } else if (matchesAny(name, SMART_RULES.datetime) || field.type === 'date' || field.type === 'datetime') {
    field.type = 'datetime';
  } else if (matchesAny(name, SMART_RULES.textarea)) {
    field.type = 'textarea';
    field.colSpan = 3;
  } else if (matchesAny(name, SMART_RULES.money)) {
    field.type = 'money';
  } else if (matchesAny(name, SMART_RULES.groupedSelect)) {
    field.type = 'groupedSelect';
    field.endpoint = apiBase;
    field.groupByField = name;
  }

  if (matchesAny(name, SMART_RULES.computedSum)) {
    field.type = 'text';
    field.computed = true;
    field.sum = true;
  }

  if (matchesAny(name, SMART_RULES.title)) field.title = true;
  if (SMART_RULES.required.test(name) && col.Null === 'NO') field.required = true;

  if (['text', 'textarea', 'groupedSelect'].includes(field.type)) field.searchable = true;

  return field;
}

/* ================= DB HELPERS ================= */

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
function assertIdentifier(name, label) {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`Invalid ${label} "${name}" — use only letters, numbers, underscores.`);
  }
}

async function createTable(connection, tableName, columnsSql) {
  assertIdentifier(tableName, 'table name');
  const sql = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columnsSql})`;
  await connection.query(sql);
  console.log(`✅ Table "${tableName}" ready.`);
}

async function addColumn(connection, tableName, columnName, columnDef) {
  assertIdentifier(tableName, 'table name');
  assertIdentifier(columnName, 'column name');
  const sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`;
  await connection.query(sql);
  console.log(`✅ Added column "${columnName}" to "${tableName}".`);
}

async function dropColumn(connection, tableName, columnName) {
  assertIdentifier(tableName, 'table name');
  assertIdentifier(columnName, 'column name');
  const sql = `ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``;
  await connection.query(sql);
  console.log(`✅ Dropped column "${columnName}" from "${tableName}".`);
}

// Reconstructs a full column definition (type + null + default + extra)
// from a SHOW COLUMNS row. Needed because MySQL's CHANGE COLUMN / MODIFY
// COLUMN both require restating the ENTIRE definition, not just the piece
// you're changing — leave off AUTO_INCREMENT/DEFAULT and the column
// silently loses it. Same numeric-vs-quoted default detection already
// used in interactiveCreateTable/interactiveAddColumn above, so a numeric
// default doesn't come out wrapped in quotes.
function buildColumnDefSql(col) {
  let def = col.Type;
  def += col.Null === 'NO' ? ' NOT NULL' : ' NULL';
  if (col.Default !== null && col.Default !== undefined) {
    const raw = String(col.Default);
    const isExpr = /^CURRENT_TIMESTAMP/i.test(raw);
    const isNumeric = /^-?\d+(\.\d+)?$/.test(raw);
    def += ` DEFAULT ${isExpr || isNumeric ? raw : `'${raw}'`}`;
  }
  if (col.Extra) def += ` ${col.Extra}`;
  return def;
}

// Uses CHANGE COLUMN (not RENAME COLUMN) so this works on MySQL 5.x too,
// not just 8.0+. `col` is the SHOW COLUMNS row for oldName — caller
// already has it from listColumns, no extra round-trip needed.
async function renameColumn(connection, tableName, oldName, newName, col) {
  assertIdentifier(tableName, 'table name');
  assertIdentifier(oldName, 'column name');
  assertIdentifier(newName, 'column name');
  const colDef = buildColumnDefSql(col);
  const sql = `ALTER TABLE \`${tableName}\` CHANGE COLUMN \`${oldName}\` \`${newName}\` ${colDef}`;
  await connection.query(sql);
  console.log(`✅ Renamed column "${oldName}" -> "${newName}" on "${tableName}".`);
}

// afterColName = null means FIRST (move to the very front of the table).
async function reorderColumn(connection, tableName, colName, col, afterColName) {
  assertIdentifier(tableName, 'table name');
  assertIdentifier(colName, 'column name');
  if (afterColName) assertIdentifier(afterColName, 'column name');
  const colDef = buildColumnDefSql(col);
  const positionSql = afterColName ? `AFTER \`${afterColName}\`` : 'FIRST';
  const sql = `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${colName}\` ${colDef} ${positionSql}`;
  await connection.query(sql);
  console.log(`✅ Moved column "${colName}" to ${afterColName ? `after "${afterColName}"` : 'FIRST'} on "${tableName}".`);
}

// Changes a column's SQL type (VARCHAR -> FLOAT, BLOB -> TEXT, etc) in
// place. `colDef` is a full definition string (already built via
// buildColumnDefSql against a col object with .Type overridden) — no
// AFTER/FIRST clause, so MODIFY COLUMN leaves its position untouched,
// same as a bare column-type change would in any DB tool.
async function modifyColumnType(connection, tableName, colName, colDef) {
  assertIdentifier(tableName, 'table name');
  assertIdentifier(colName, 'column name');
  const sql = `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${colName}\` ${colDef}`;
  await connection.query(sql);
  console.log(`✅ Changed type of "${colName}" on "${tableName}" -> ${colDef}`);
}

async function listColumns(connection, tableName) {
  assertIdentifier(tableName, 'table name');
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return rows;
}

/* ================= RECYCLE-ON-OVERWRITE (same approach as clone-module.js) ================= */

function buildRunTimestamp() {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}`;
}

function backupExistingFile(filePath, runTimestamp) {
  const folder = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);

  let backupPath = path.join(folder, '_recycled', `${base}.${runTimestamp}${ext}`);
  let attempt = 1;
  while (fs.existsSync(backupPath)) {
    attempt += 1;
    backupPath = path.join(folder, '_recycled', `${base}.${runTimestamp}-${attempt}${ext}`);
  }

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.renameSync(filePath, backupPath);
  console.log(`   ♻️  existing file backed up -> ${path.relative(__dirname, backupPath)}`);
}

/* ================= PROMPT HELPERS ================= */

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
async function askYesNo(q) {
  return /^(y|yes)$/i.test(await ask(q));
}
// Same as askYesNo but blank Enter counts as "yes" — for prompts where the
// safe/expected default IS proceeding (e.g. "use these smart defaults?"),
// as opposed to destructive confirmations where blank should mean "no".
async function askYesNoDefaultYes(q) {
  const answer = (await ask(q)).toLowerCase();
  return answer === '' || answer === 'y' || answer === 'yes';
}

async function pickType() {
  console.log('\n  Type:');
  TYPE_CHOICES.forEach((t, i) => console.log(`    ${i + 1}. ${t}  (${TYPE_MAP[t]})`));
  const choice = await ask('  Pick a number [1]: ');
  const key = TYPE_CHOICES[parseInt(choice || '1', 10) - 1] || 'text';
  return TYPE_MAP[key];
}

// Separate from pickType/TYPE_MAP on purpose — TYPE_MAP is the small,
// schema-field-oriented set used when CREATING a column from scratch.
// Modifying an EXISTING column's type needs to reach things TYPE_MAP
// doesn't cover at all (BLOB, ENUM, JSON, LONGTEXT) and needs to accept
// an arbitrary raw SQL type (e.g. "VARCHAR(100)", "ENUM('a','b')") since
// there's no way to enumerate every legal MySQL type up front.
const RAW_TYPE_PRESETS = [
  'VARCHAR(255)', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT',
  'INT', 'BIGINT', 'DECIMAL(12,2)', 'FLOAT', 'DOUBLE',
  'DATE', 'DATETIME', 'TINYINT(1)', 'BLOB', 'LONGBLOB', 'JSON',
];

async function pickRawSqlType(currentType) {
  console.log(`\n  Current type: ${currentType}`);
  console.log('  Pick a new type, or type your own raw SQL type directly (e.g. VARCHAR(100), ENUM(\'a\',\'b\')):');
  RAW_TYPE_PRESETS.forEach((t, i) => console.log(`    ${i + 1}. ${t}`));
  const choice = await ask('  Number, or raw SQL type (blank = keep current): ');
  if (!choice) return currentType;
  const idx = parseInt(choice, 10);
  if (!isNaN(idx) && RAW_TYPE_PRESETS[idx - 1]) return RAW_TYPE_PRESETS[idx - 1];
  return choice; // treat as a raw type string typed in directly
}

/* ================= .ENV VIEW / EDIT ================= */

const ENV_KEYS = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
const ENV_PATH = path.join(__dirname, '.env');

const ENV_TO_CONFIG_KEY = { DB_HOST: 'host', DB_USER: 'user', DB_PASS: 'password', DB_NAME: 'database' };

function maskValue(key, value) {
  if (key === 'DB_PASS' && value) return '*'.repeat(value.length);
  return value || '(empty)';
}

async function interactiveViewEditEnv() {
  const current = loadEnv();
  console.log('');
  diagnoseEnv();
  console.log('');
  ENV_KEYS.forEach((key) => {
    const value = current[key] !== undefined ? current[key] : `(using default: ${DB_CONFIG[ENV_TO_CONFIG_KEY[key]] || '(empty)'})`;
    console.log(`  ${key} = ${key === 'DB_PASS' && current[key] !== undefined ? maskValue(key, current[key]) : value}`);
  });

  if (!(await askYesNo('\nEdit these values? (y/n) '))) return;

  const updated = { ...current };
  for (const key of ENV_KEYS) {
    const existing = current[key] || '';
    const prompt = key === 'DB_PASS'
      ? `  ${key} [${maskValue(key, existing)}] (blank = keep current): `
      : `  ${key} [${existing || '(empty)'}] (blank = keep current): `;
    const input = await ask(prompt);
    if (input !== '') updated[key] = input;
  }

  const content = ENV_KEYS.map((key) => `${key}=${updated[key] || ''}`).join('\n') + '\n';
  fs.writeFileSync(ENV_PATH, content);
  console.log(`\n✅ Saved to ${ENV_PATH}`);
  console.log('👉 Restart db-cli.js for the new values to take effect (the current connection stays on the old ones).');
}

async function interactiveCreateTable(connection) {
  const tableName = await ask('\nTable name: ');
  if (!tableName) return console.log('Cancelled — no table name given.');

  const columns = ['`id` int(11) PRIMARY KEY AUTO_INCREMENT'];
  console.log('Add columns one at a time. Leave name blank when done.\n');

  while (true) {
    const colName = await ask(`Column ${columns.length} name (blank to finish): `);
    if (!colName) break;

    const sqlType = await pickType();
    const required = await askYesNo('  Required? (y/n) [n]: ');
    const defaultVal = await ask('  Default value (blank for none): ');

    let line = `\`${colName}\` ${sqlType} ${required ? 'NOT NULL' : 'NULL'}`;
    if (defaultVal) {
      const isNumeric = /^-?\d+(\.\d+)?$/.test(defaultVal);
      line += ` DEFAULT ${isNumeric ? defaultVal : `'${defaultVal}'`}`;
    }
    columns.push(line);
    console.log(`  ✅ added: ${line}\n`);
  }

  columns.push('`created_at` datetime DEFAULT CURRENT_TIMESTAMP');
  const columnsSql = columns.join(',\n  ');
  console.log(`\nAbout to run:\nCREATE TABLE IF NOT EXISTS \`${tableName}\` (\n  ${columnsSql}\n)\n`);

  if (await askYesNo('Create this table? (y/n) ')) {
    await createTable(connection, tableName, columnsSql);
  } else {
    console.log('Cancelled.');
  }
}

async function pickExistingTable(connection, promptLabel = 'Pick a table (number): ') {
  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map((row) => Object.values(row)[0]);
  if (tableNames.length === 0) {
    console.log('No tables found — create one first.');
    return null;
  }
  console.log('\nTables:');
  tableNames.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  const choice = await ask(promptLabel);
  return tableNames[parseInt(choice, 10) - 1] || null;
}

async function interactiveAddColumn(connection) {
  const tableName = await pickExistingTable(connection);
  if (!tableName) return console.log('Cancelled.');

  const colName = await ask('New column name: ');
  if (!colName) return console.log('Cancelled — no column name given.');

  const sqlType = await pickType();
  const required = await askYesNo('  Required? (y/n) [n]: ');
  const defaultVal = await ask('  Default value (blank for none): ');

  let columnDef = `${sqlType} ${required ? 'NOT NULL' : 'NULL'}`;
  if (defaultVal) {
    const isNumeric = /^-?\d+(\.\d+)?$/.test(defaultVal);
    columnDef += ` DEFAULT ${isNumeric ? defaultVal : `'${defaultVal}'`}`;
  }

  console.log(`\nAbout to run:\nALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${columnDef}\n`);
  if (await askYesNo('Add this column? (y/n) ')) {
    await addColumn(connection, tableName, colName, columnDef);
  } else {
    console.log('Cancelled.');
  }
}

async function interactiveDropColumn(connection) {
  const tableName = await pickExistingTable(connection);
  if (!tableName) return console.log('Cancelled.');

  const columns = await listColumns(connection, tableName);
  columns.forEach((c, i) => console.log(`  ${i + 1}. ${c.Field}`));
  const colName = columns[parseInt(await ask('Pick a column to drop (number): '), 10) - 1]?.Field;
  if (!colName) return console.log('Cancelled.');

  if (await askYesNo(`⚠️  Permanently delete "${colName}" and its data? (y/n) `)) {
    await dropColumn(connection, tableName, colName);
  } else {
    console.log('Cancelled.');
  }
}

async function interactiveRenameColumn(connection) {
  const tableName = await pickExistingTable(connection);
  if (!tableName) return console.log('Cancelled.');

  const columns = await listColumns(connection, tableName);
  columns.forEach((c, i) => console.log(`  ${i + 1}. ${c.Field}  (${c.Type})`));
  const col = columns[parseInt(await ask('Pick a column to rename (number): '), 10) - 1];
  if (!col) return console.log('Cancelled.');

  if (col.Key === 'PRI') {
    console.log('⚠️  This is the primary key — renaming it will break anything hardcoded to its old name (routes, joins, schema.js).');
    if (!(await askYesNo('Still continue? (y/n) '))) return console.log('Cancelled.');
  }

  const newName = await ask(`New name for "${col.Field}": `);
  if (!newName) return console.log('Cancelled — no new name given.');
  if (newName === col.Field) return console.log('Cancelled — new name is the same as the current one.');

  console.log(`\nAbout to run:\nALTER TABLE \`${tableName}\` CHANGE COLUMN \`${col.Field}\` \`${newName}\` ${buildColumnDefSql(col)}\n`);
  console.log('⚠️  Renaming a DB column does NOT update schema.js — the field key there will now');
  console.log('   point at a column that no longer exists. Rebuild the schema (menu option 7) or');
  console.log('   hand-edit both schema.js files (frontend + backend) right after this.');

  if (await askYesNo('Rename this column? (y/n) ')) {
    await renameColumn(connection, tableName, col.Field, newName, col);
  } else {
    console.log('Cancelled.');
  }
}

async function interactiveReorderColumn(connection) {
  const tableName = await pickExistingTable(connection);
  if (!tableName) return console.log('Cancelled.');

  const columns = await listColumns(connection, tableName);
  columns.forEach((c, i) => console.log(`  ${i + 1}. ${c.Field}  (${c.Type})`));
  const col = columns[parseInt(await ask('Pick a column to move (number): '), 10) - 1];
  if (!col) return console.log('Cancelled.');

  console.log(`\nMove "${col.Field}" to:`);
  console.log('  0. FIRST (top of table)');
  columns.forEach((c, i) => {
    if (c.Field !== col.Field) console.log(`  ${i + 1}. right after "${c.Field}"`);
  });

  const posChoice = await ask('Pick a position (number): ');
  let afterColName = null; // null == FIRST

  if (posChoice !== '0') {
    const target = columns[parseInt(posChoice, 10) - 1];
    if (!target || target.Field === col.Field) return console.log('Cancelled — invalid position.');
    afterColName = target.Field;
  }

  console.log(`\nAbout to run:\nALTER TABLE \`${tableName}\` MODIFY COLUMN \`${col.Field}\` ${buildColumnDefSql(col)} ${afterColName ? `AFTER \`${afterColName}\`` : 'FIRST'}\n`);
  console.log('ℹ️  This only changes physical column order in the DB. schema.js field/section order');
  console.log('   is independent — edit `sections[].fields` there to change display order.');

  if (await askYesNo('Move this column? (y/n) ')) {
    await reorderColumn(connection, tableName, col.Field, col, afterColName);
  } else {
    console.log('Cancelled.');
  }
}

async function interactiveModifyColumnType(connection) {
  const tableName = await pickExistingTable(connection);
  if (!tableName) return console.log('Cancelled.');

  const columns = await listColumns(connection, tableName);
  columns.forEach((c, i) => console.log(`  ${i + 1}. ${c.Field}  (${c.Type})`));
  const col = columns[parseInt(await ask('Pick a column to change type (number): '), 10) - 1];
  if (!col) return console.log('Cancelled.');

  console.log(`\nCurrent: \`${col.Field}\` ${buildColumnDefSql(col)}`);

  const newType = await pickRawSqlType(col.Type);
  if (newType === col.Type) return console.log('Cancelled — type unchanged.');

  const nullDefaultSummary = `${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}${col.Default != null ? `, DEFAULT ${col.Default}` : ''}`;
  const keepNullDefault = await askYesNoDefaultYes(`Keep current NULL/DEFAULT settings (${nullDefaultSummary})? (Enter = yes) `);

  let newCol = { ...col, Type: newType };
  if (!keepNullDefault) {
    const required = await askYesNo('  Required (NOT NULL)? (y/n) [n]: ');
    newCol.Null = required ? 'NO' : 'YES';
    const defaultVal = await ask('  Default value (blank for none): ');
    newCol.Default = defaultVal || null;
  }

  const colDef = buildColumnDefSql(newCol);

  console.log(`\nAbout to run:\nALTER TABLE \`${tableName}\` MODIFY COLUMN \`${col.Field}\` ${colDef}\n`);
  console.log(`⚠️  Changing "${col.Field}" from ${col.Type} -> ${newType} can lose or truncate data`);
  console.log('   already in the table (non-numeric text into a numeric type, oversized values into a');
  console.log('   smaller one, binary data through a text type, etc). MySQL will either reject rows it');
  console.log('   can\'t convert or silently truncate/zero them depending on sql_mode — back up first');
  console.log('   if this table has data you care about.');
  console.log('ℹ️  schema.js\'s field `type` (text/money/select/etc.) is a separate UI-level concept —');
  console.log('   update it by hand, or rebuild via menu option 8, to match the new column type.');

  if (await askYesNo("Change this column's type? (y/n) ")) {
    await modifyColumnType(connection, tableName, col.Field, colDef);
  } else {
    console.log('Cancelled.');
  }
}

async function interactiveListColumns(connection) {
  const tableName = await pickExistingTable(connection);
  if (!tableName) return console.log('Cancelled.');

  const columns = await listColumns(connection, tableName);
  console.table(columns.map((c) => ({ Field: c.Field, Type: c.Type, Null: c.Null, Default: c.Default })));
}


// Maps a MySQL column type to a schema field type
function sqlTypeToFieldType(sqlType) {
  const t = sqlType.toLowerCase();
  if (t.startsWith('decimal') || t.startsWith('float') || t.startsWith('double')) return 'money';
  if (t.startsWith('int') || t.startsWith('bigint') || t.startsWith('smallint')) return 'number';
  if (t === 'tinyint(1)') return 'boolean';
  if (t === 'text' || t === 'longtext' || t === 'mediumtext') return 'textarea';
  if (t === 'date') return 'date';
  if (t === 'datetime' || t === 'timestamp') return 'datetime';
  return 'text';
}

function toLabel(fieldKey) {
  return fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function toPascalCase(str) {
  return str.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
}

// Fields every table has that shouldn't become editable schema fields.
const SCHEMA_AUTO_FIELDS = new Set(['created_at', 'updated_at']);

// Columns that should be dropped from the FRONTEND schema entirely (not
// just an attribute trimmed off them, like label/searchable — the whole
// field entry, plus any showInList/sections reference to it). They still
// flow into the BACKEND schema untouched, since the backend/API may still
// need them (e.g. a cached join column paired with its id column). Add
// more field names here as needed — this is the one place to edit.
const FRONTEND_SKIP_FIELDS = new Set(['hive_site_id', 'hive_site_name']);

// Serializes a field descriptor object into a single schema.js field-entry
// line. `excludeKeys` lets each output target (frontend vs backend) drop
// attributes it doesn't want without needing two separate classification
// passes — the field OBJECT is always built with every attribute; only the
// serialized STRING differs per target.
function serializeFieldEntry(field, excludeKeys = []) {
  const parts = Object.entries(field)
    .filter(([k]) => !excludeKeys.includes(k))
    .map(([k, v]) => (typeof v === 'string' ? `${k}: '${v}'` : `${k}: ${v}`));
  return `{ ${parts.join(', ')} },`;
}

function buildSystemFieldObject(col) {
  const type = sqlTypeToFieldType(col.Type);
  return { key: col.Field, label: toLabel(col.Field), type, system: true, editable: false };
}

async function interactiveBuildSchema(connection) {
  const tableName = await pickExistingTable(connection, 'Pick a table to introspect (number): ');
  if (!tableName) return console.log('Cancelled.');

  const defaultModuleName = tableName.replace(/_/g, '');
  const defaultAppNamespace = path.basename(__dirname);
  const defaultApiBase = `/api/${defaultAppNamespace}/${defaultModuleName}`;
  const defaultImportApiBase = `${defaultApiBase}/import`;

  console.log(`\nDefaults for "${tableName}":`);
  console.log(`  moduleName  = ${defaultModuleName}`);
  console.log(`  appNamespace = ${defaultAppNamespace}`);
  console.log(`  apiBase     = ${defaultApiBase}`);
  console.log(`  importApiBase = ${defaultImportApiBase}`);

  let moduleName = defaultModuleName;
  let appNamespace = defaultAppNamespace;
  let apiBase = defaultApiBase;
  let importApiBase = defaultImportApiBase;

  if (!(await askYesNoDefaultYes('Use these? (Enter = yes, n = edit one at a time) '))) {
    moduleName = (await ask(`Module name (variable/folder name) [${defaultModuleName}]: `)) || defaultModuleName;
    const appNamespaceInput = await ask(`App namespace [${defaultAppNamespace}] (type "-" for none): `);
    appNamespace = appNamespaceInput === '-' ? '' : (appNamespaceInput || defaultAppNamespace);
    const recomputedApiBase = appNamespace ? `/api/${appNamespace}/${moduleName}` : `/api/${moduleName}`;
    apiBase = (await ask(`apiBase [${recomputedApiBase}]: `)) || recomputedApiBase;
    // importApiBase always follows whatever apiBase ended up being (default
    // OR custom), not the original recomputed guess — keeps /import in sync
    // with app namespace + selected module even if apiBase was overridden.
    importApiBase = (await ask(`importApiBase [${apiBase}/import]: `)) || `${apiBase}/import`;
  }

  const allColumns = await listColumns(connection, tableName);
  if (allColumns.length < 2) {
    return console.log(`❌ "${tableName}" has fewer than 2 columns — need at least a primary key + a record id column to build a schema.`);
  }

  const [primkeyColumn, recordIdColumn] = allColumns;
  const droppedSensitive = allColumns.slice(2).filter((c) => matchesAny(c.Field, SMART_RULES.sensitive)).map((c) => c.Field);
  const columns = allColumns.slice(2).filter((c) => !SCHEMA_AUTO_FIELDS.has(c.Field) && !matchesAny(c.Field, SMART_RULES.sensitive));

  if (droppedSensitive.length) {
    console.log(`\n🔒 Excluded from schema (looks sensitive): ${droppedSensitive.join(', ')}`);
  }

  const systemFieldObjects = [buildSystemFieldObject(primkeyColumn), buildSystemFieldObject(recordIdColumn)];

  // Frontend-only view of the columns: sections, showInList, and the
  // fields array itself never mention FRONTEND_SKIP_FIELDS. The backend
  // schema keeps using the full `columns` list below, unaffected.
  const frontendColumns = columns.filter((c) => !FRONTEND_SKIP_FIELDS.has(c.Field));
  const skippedFromFrontend = columns.filter((c) => FRONTEND_SKIP_FIELDS.has(c.Field)).map((c) => c.Field);
  if (skippedFromFrontend.length) {
    console.log(`\n🚫 Skipped from FRONTEND schema only (still in backend): ${skippedFromFrontend.join(', ')}`);
  }

  const LIST_COLUMN_COUNT = 7;
  const showInListKeys = ['row_count',...frontendColumns.slice(0, LIST_COLUMN_COUNT).map((c) => c.Field)];

  // Same positional split feeds `sections`: first LIST_COLUMN_COUNT real
  // columns -> "Basic Information", everything else -> "Other Details".
  // Hand-tune this afterward same as you always have — this just gets the
  // rough cut in place instantly.
  const basicSectionKeys = frontendColumns.slice(0, LIST_COLUMN_COUNT).map((c) => c.Field);
  const otherSectionKeys = frontendColumns.slice(LIST_COLUMN_COUNT).map((c) => c.Field);

  const computedDefaultFieldObjects = [
    { key: 'row_count', label: '#', type: 'number', computed: true, editable: false },
  ];

  // This is the ONE shared field OBJECT list — same fields, same order,
  // used to derive BOTH the frontend schema (full, minus `searchable`) and
  // the backend schema (trimmed, minus `label`). Fields aren't a
  // "frontend-only" concept: EntityDataEngine needs the same key/type/
  // computed/editable info server-side, just without the UI-only label.
  const fieldObjects = [
    ...systemFieldObjects,
    ...columns.map((c) => classifySmartField(c, apiBase)).filter(Boolean),
    ...computedDefaultFieldObjects,
  ];
  const fieldKeys = [
    `${primkeyColumn.Field} (system)`,
    `${recordIdColumn.Field} (system)`,
    ...columns.map((c) => `${c.Field}${showInListKeys.includes(c.Field) ? ' (list)' : ''}`),
    'row_count (computed, list)',
  ];

  console.log(`\n📋 Showing in list view (first ${LIST_COLUMN_COUNT} + row_count): ${showInListKeys.join(', ')}`);
  console.log(`\nFound ${fieldObjects.length} field(s) for "${tableName}" (includes ${primkeyColumn.Field}, ${recordIdColumn.Field}, row_count): ${fieldKeys.join(', ')}`);
  console.log('You can add more extra display-only fields now — any other computed');
  console.log('value the backend adds that isn\'t an actual DB column.\n');

  while (await askYesNo('Add an extra (computed, non-DB) field? (y/n) ')) {
    const key = await ask('  Field key: ');
    if (!key) { console.log('  Skipped — no key given.'); continue; }
    const label = (await ask(`  Label [${toLabel(key)}]: `)) || toLabel(key);
    fieldObjects.push({ key, label, type: 'text', computed: true });
    fieldKeys.push(`${key} (computed)`);
    console.log(`  ✅ added: ${key} (computed: true — won't be written to the DB)`);

    if (await askYesNo(`  Also show "${key}" in list view? (y/n) `)) {
      showInListKeys.push(key);
      console.log(`  ✅ added "${key}" to showInList`);
    }

    console.log(`  Current field list: ${fieldKeys.join(', ')}\n`);
  }

  console.log(`\n📋 Final field list (${fieldObjects.length} total): ${fieldKeys.join(', ')}`);
  console.log(`📋 Final showInList: [${showInListKeys.join(', ')}]`);

  // Frontend never needs `searchable` (that's a backend/API filtering
  // concern), and drops FRONTEND_SKIP_FIELDS entirely; backend never needs
  // `label` (UI-only display text) but keeps every field, including those
  // skipped from the frontend.
  const fieldLinesFrontend = fieldObjects
    .filter((f) => !FRONTEND_SKIP_FIELDS.has(f.key))
    .map((f) => '    ' + serializeFieldEntry(f, ['searchable']))
    .join('\n');
  const fieldLinesBackend = fieldObjects
    .map((f) => '    ' + serializeFieldEntry(f, ['label']))
    .join('\n');

  const showInListLiteral = `[${showInListKeys.map((k) => `'${k}'`).join(', ')}]`;
  // Bug fix: showInListLiteral is already a rendered string ("[...]"), so
  // .filter() on it below would throw (strings have no .filter method).
  // exportColumns needs its own array -> literal built from showInListKeys
  // directly, same content minus 'row_count' (that column is UI-computed,
  // not something you'd want in an upload/export CSV template).
  const exportColumnsLiteral = `[${showInListKeys.filter((k) => k !== 'row_count').map((k) => `'${k}'`).join(', ')}]`;
  const label = toPascalCase(moduleName).replace(/([A-Z])/g, ' $1').trim();
  const singular = label.toLowerCase().replace(/s$/, '');

  const basicFieldsLiteral = `[${basicSectionKeys.map((k) => `'${k}'`).join(', ')}]`;
  const otherFieldsLiteral = `[${otherSectionKeys.map((k) => `'${k}'`).join(', ')}]`;
  const sectionsBlock = otherSectionKeys.length
    ? `  sections: [
    { key: 'basic_information', label: 'Basic Information', columns: 3, fields: ${basicFieldsLiteral} },
    { key: 'other_details', label: 'Other Details', columns: 3, fields: ${otherFieldsLiteral} },
  ],`
    : `  sections: [
    { key: 'basic_information', label: 'Basic Information', columns: 3, fields: ${basicFieldsLiteral} },
  ],`;

  // ---------- FRONTEND schema (full — unchanged shape) ----------
  const schemaJsFrontend = `// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.
// Rough cut auto-generated by db-cli.js (rule-based column-name matching,
// no AI) — hand-tune sections/profileActions/groupedSelect below same as
// any other cloned module.
//
// FRONTEND schema — full UI shape (showInList, profileActions, apiBase,
// rowLinks, customBlocks, sections, moduleRole, etc). The trimmed backend
// counterpart lives alongside this at the api/ path and only carries
// entity/fields/batchMutations/roles.

import { getApiRoutes } from '../AppRoutes/apiRoutesHandler';
// Use default base root (/)
const apiRoutes = getApiRoutes();
const moduleApi = apiRoutes.${moduleName}.base;

export const ${toPascalCase(moduleName)}Schema = {
  entity: '${tableName}',              // DB table name; also drives default role names
                                     // (view_${moduleName} / manage_${moduleName}) and apiBase
  label: '${label}',                 // optional, defaults to entity capitalized
  apiBase: moduleApi,

  //api endpint for importing data from csv
  importDataEndpoint : apiRoutes.${moduleName}.import,

  // Page-level UI gate — checked once, for the WHOLE grid AND the WHOLE
  // profile/form page, via mosyACTRLHasRole. No moduleRole set -> open to
  // anyone (same additive convention as every other role/flag in this
  // file). This is a different layer than the per-action \`role\` flag
  // inside individual moduleActions entries below: moduleRole controls
  // whether someone can reach the page at all; a per-action role controls
  // whether one specific button shows up once they're already in. Same
  // UI-only caveat as those: route.js needs the equivalent server-side
  // check for this to be real enforcement, not just hiding.
  moduleRole: 'view_${moduleName}',


  gridOptions : {
   checkBoxes : false,
   checkFunction : "gridCheckBoxAction"  
  },

  multiGridRows: [
    // {
    //   key: 'order_items',
    //   parentTable: 'gps_logs',
    //   title: 'Log summary',
    //   columns: [
    //     { key: 'speed', label: 'Speed' },
    //     { key: 'latitude', label: 'Lat' },
    //     { key: 'longitude', label: 'Long' , sum: true},
    //     { key: 'remark', label: 'Selling price' }
    //   ],
    //   viewMoreLink: '../gpslogs/list',
    //   filter: { order_id: '{record_id}' },
    // },
  ],

  rowLinks: [],

  // Actions available from the list view, form and grid in display order.
  //{ 
  // key: 'filter_by_client', -- name of the action 
  // label: 'Filter by account', -- button label 
  // icon: 'user', -- icon of the buttons
  // grid:true, -- show on grid or not, 
  // type: 'action', -- indicates action on form registry 
  // form: false, -- show on form or not, 
  // rowAction: false --show on row drop down or not
  // variant : 'outline-primary', -- button color  variant
  // navigateTo: '/supererpv5/revenueplan/profile', -- route to navigate to -  for link buttons only 
  // colorClass:"bg-success text-white", -- button color classname 
  // confirm: 'Are you sure you want to delete this revenueplan?', -- confirmation message for delete button
  // editOnly: true, -- show on edit only or not
  // role: 'manage_revenueplan' -- role required for this action
  //},

  profileActions: [
    { key: 'back', label: 'Back to list', icon: 'arrow-left', variant: 'outline-secondary', navigateTo: '/${appNamespace ? appNamespace + '/' : ''}${moduleName}/list', grid: false, form: true },
    { key: 'save', label: 'Save', icon: 'save', variant: 'primary', grid: false, form: true, rowAction: false },
    { key: 'delete', label: 'Delete', icon: 'trash', variant: 'outline-danger', confirm: 'Are you sure you want to delete this ${singular}?', editOnly: true, grid: false, form: true, rowAction: true, role: 'manage_${moduleName}' },
    { key: 'view', label: 'View more', icon: 'edit', rowAction: true },
    { key: 'new', label: 'New ${label.replace(/s$/, '')}', icon: 'plus', variant: 'outline-primary', navigateTo: '/${appNamespace ? appNamespace + '/' : ''}${moduleName}/profile', grid: true, form: false, rowAction: false },
    { key: 'clone', label: 'Clone Record', icon: 'copy', variant: 'outline-secondary', editOnly: true, grid: false, form: true, rowAction: false, role: 'manage_${moduleName}' },
    //{ key: 'filterByDate', label: 'Filter by date', icon: 'calendar', variant: 'outline-primary', type: 'action', grid: true, form: false, rowAction: false },
  ],



  // customBlocks — the escape hatch for UI that doesn't fit the rigid
  // field-grid: a raw component, handed the SAME values/setValue/errors/
  // schema/isEditing/row context a real field gets. A block's \`key\` just
  // sits in a section's \`fields\` array exactly like a real field key —
  // wherever it appears there is where it renders. Empty by default;
  // uncomment and point at a real component when a field needs custom UI
  // (see SCHEMA-SPEC.md for the full pattern, e.g. companies/schema.js).
  customBlocks: [
    // { key: 'some_field', component: SomeComponent, colSpan: 7 },
  ],

  fieldGroups: [],
  // Field keys shown as columns in list view, in display order.
  showInList: ${showInListLiteral},

  //export columns these columns are used to generate upload csv template file
  exportColumns: ${exportColumnsLiteral},

${sectionsBlock}

  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
${fieldLinesFrontend}
    //  live search field sample 
    // { key: 'permissions', label: 'Permissions',
    //   type: 'liveSearch', colSpan: 6,
    //   endpoint: '/api/assetguard/systemmodules',
    //   searchTable: 'system_modules',
    //   valueField: 'record_id',      // id column on system_modules
    //   displayField: 'module_name',  // label column on system_modules — what search results/defaultValue text actually render
    //   labelKey: 'permission_name',  // cached label already joined onto THIS row (system_roles) — only used to seed defaultValue on load
    // },
    // more fields... see SCHEMA-SPEC.md for the full field option list
    // (searchable, editable, options, priority, db overrides)
  ],

  filters: [
    { key: 'all', label: 'All', query: {} },
  ],

  actions: [
    // { key: 'some_action', label: 'Do Something', appliesTo: { status: 'x' } },
    // "key" must match a function registered in lib/actionsRegistry.js
  ],

// for button color classes  
// dyn-btn-accent-amber  { border-color: transparent; color: #b45309; }
// dyn-btn-accent-green  { border-color: transparent; color: #047857; }
// dyn-btn-accent-purple { border-color: transparent; color: #6d28d9; }
// dyn-btn-accent-pink   { border-color: transparent; color: #be185d; }
// dyn-btn-accent-red    { border-color: transparent; color: #b91c1c; }
// dyn-btn-accent-yellow { border-color: transparent; color: #a16207; }
// dyn-btn-accent-blue   { border-color: transparent; color: #1d4ed8; }
// dyn-btn-accent-teal   { border-color: transparent; color: #0f766e; }

  // Optional: only needed if permission keys don't follow the
  // view_<entity> / manage_<entity> default.
  // roles: { view: 'view_${moduleName}', manage: 'manage_${moduleName}' },
};
`;

  // ---------- BACKEND schema (trimmed — data shape only) ----------
  // Deliberately excludes everything UI-only: showInList, exportColumns,
  // profileActions, apiBase, importDataEndpoint, rowLinks, customBlocks,
  // fieldGroups, sections, moduleRole, filters, actions, label — both at
  // the top level (never had it) AND now per-field (label is a display
  // string, not something EntityDataEngine needs to do CRUD/joins/roles).
  const schemaJsBackend = `// Auto-generated by db-cli.js — BACKEND schema (trimmed).
// This is the data-shape-only counterpart to the frontend schema.js at the
// matching app/ path. It intentionally does NOT include showInList,
// profileActions, apiBase, rowLinks, customBlocks, sections, moduleRole,
// filters, or actions — those are UI concerns and live in the frontend
// schema only. Field entries also omit \`label\` here (UI-only display
// text) even though the frontend fields carry it. Edit
// fields/batchMutations/roles here; edit everything else there. Keep the
// \`fields\` array in sync between the two by regenerating both together
// (this tool writes both from the same column read).

export const ${toPascalCase(moduleName)}Schema = {
  entity: '${tableName}',

  moduleRole: 'view_${tableName}',

  fields: [
    // key: DB column name | type: drives SQL/validation (label omitted —
    // UI-only, lives in the frontend schema)
${fieldLinesBackend}
  ],

  // Optional: joins enriching each row with data from another table.
  // Same shape as your existing *BatchMutations.js files.
  batchMutations: {
    // "_staff_full_name_staff_id": {
    //   type: "join", table: "staff", link: "staff_id:record_id",
    //   select: { "_staff_full_name_staff_id": "full_name" }
    // },
  },

  roles: { view: 'view_${moduleName}', manage: 'manage_${moduleName}' },
};
`;

  console.log('\n----- FRONTEND schema preview -----\n' + schemaJsFrontend);
  console.log('\n----- BACKEND schema preview -----\n' + schemaJsBackend);

  const frontendOutPath = appNamespace
  ? path.join(__dirname, 'app', appNamespace, moduleName, 'schema.js')
  : path.join(__dirname, 'app', moduleName, 'schema.js');

const apiOutPath = appNamespace
  ? path.join(__dirname, 'app', 'api', appNamespace, moduleName, 'schema.js')
  : path.join(__dirname, 'app', 'api', moduleName, 'schema.js');

console.log('\nWill write:');
console.log(`  1. ${path.relative(__dirname, frontendOutPath)}  (frontend — full)`);
console.log(`  2. ${path.relative(__dirname, apiOutPath)}  (backend — trimmed: entity/fields/batchMutations/roles)`);
if (appNamespace) {
  console.log(`  3. app/${appNamespace}/AppRoutes/apiRoutes.json  (route entry for "${moduleName}")`);
} else {
  console.log(`  3. ⚠️  no app namespace set — apiRoutes.json entry will be SKIPPED (moduleApi in the frontend schema will fail to resolve)`);
}

const writeChoice = await ask('Write to both? (y = both / f = frontend only / a = api only / - = skip): ');

const targets = [];
let writingFrontend = false;
if (writeChoice === '' || writeChoice.toLowerCase() === 'y') {
  targets.push({ outPath: frontendOutPath, content: schemaJsFrontend });
  targets.push({ outPath: apiOutPath, content: schemaJsBackend });
  writingFrontend = true;
} else if (writeChoice.toLowerCase() === 'f') {
  targets.push({ outPath: frontendOutPath, content: schemaJsFrontend });
  writingFrontend = true;
} else if (writeChoice.toLowerCase() === 'a') {
  targets.push({ outPath: apiOutPath, content: schemaJsBackend });
} else if (writeChoice === '-') {
  return console.log('Not written — copy the output above manually if needed.');
} else {
  return console.log('Not written — unrecognized choice.');
}

const RUN_TIMESTAMP = buildRunTimestamp();

for (const { outPath, content } of targets) {
  if (fs.existsSync(outPath)) {
    backupExistingFile(outPath, RUN_TIMESTAMP);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
  console.log(`✅ Written to ${path.relative(__dirname, outPath)}`);
}

// The frontend schema references apiRoutes.<moduleName>.base / .import at
// runtime (via getApiRoutes()), instead of hardcoding the URL string. Keep
// app/<appNamespace>/AppRoutes/apiRoutes.json in sync whenever we write
// (or would have written) the frontend schema, same "one file to route
// them all" idea as the routes-writer script this mirrors.
if (writingFrontend) {
  updateApiRoutesJson(appNamespace, moduleName, apiBase, importApiBase);
}

}

// Reads (or creates) app/<appNamespace>/AppRoutes/apiRoutes.json and
// upserts the entry for this module — mirrors the shape produced by the
// standalone routes-writer script (base / delete / import per module key),
// but keyed by the SAME apiBase/importApiBase this tool already computed
// for the schema, so the two never drift apart.
function updateApiRoutesJson(appNamespace, moduleName, apiBase, importApiBase) {
  if (!appNamespace) {
    console.log('⚠️  No app namespace set — skipping apiRoutes.json update (moduleApi will have nothing to resolve against).');
    return;
  }

  const routesDir = path.join(__dirname, 'app', appNamespace, 'AppRoutes');
  const routesPath = path.join(routesDir, 'apiRoutes.json');

  let routes = {};
  if (fs.existsSync(routesPath)) {
    try {
      routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
    } catch (err) {
      console.log(`⚠️  Could not parse existing apiRoutes.json (${err.message}) — starting a fresh file (old one is untouched until we write below).`);
      routes = {};
    }
  }

  routes[moduleName] = {
    base: apiBase,
    delete: `${apiBase}/delete`,
    import: importApiBase,
  };

  fs.mkdirSync(routesDir, { recursive: true });
  fs.writeFileSync(routesPath, JSON.stringify(routes, null, 4));
  console.log(`✅ Updated ${path.relative(__dirname, routesPath)} — "${moduleName}": ${JSON.stringify(routes[moduleName])}`);
}

/* ================= MENU ================= */

async function showMenu(connection) {
  console.log(`
What do you want to do?
  --- Structure ---
  1. Create table
  2. Add column
  3. Drop column
  4. Rename column
  5. Reorder column
  6. Modify column type
  7. List columns
  --- Code ---
  8. Build schema.js from a table
  --- Settings ---
  9. View/edit .env
  10. Exit
`);
  const choice = await ask('Pick a number: ');

  if (choice === '1') await interactiveCreateTable(connection);
  else if (choice === '2') await interactiveAddColumn(connection);
  else if (choice === '3') await interactiveDropColumn(connection);
  else if (choice === '4') await interactiveRenameColumn(connection);
  else if (choice === '5') await interactiveReorderColumn(connection);
  else if (choice === '6') await interactiveModifyColumnType(connection);
  else if (choice === '7') await interactiveListColumns(connection);
  else if (choice === '8') await interactiveBuildSchema(connection);
  else if (choice === '9') await interactiveViewEditEnv();
  else return; // exit

  if (await askYesNo('\nDo something else? (y/n) ')) await showMenu(connection);
}

/* ================= ENTRY ================= */

(async () => {
  diagnoseEnv();
  console.log(`\n🔌 Connecting to ${DB_CONFIG.user}@${DB_CONFIG.host}/${DB_CONFIG.database} ...`);

  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
  } catch (err) {
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.log(`⚠️  Database "${DB_CONFIG.database}" doesn't exist yet.`);
      const create = await askYesNo(`Create it now? (y/n) `);

      if (!create) {
        console.log('Cancelled.');
        rl.close();
        process.exit(1);
      }

      const rootConnection = await mysql.createConnection({
        host: DB_CONFIG.host,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
      });
      await rootConnection.query(`CREATE DATABASE \`${DB_CONFIG.database}\``);
      await rootConnection.end();
      console.log(`✅ Database "${DB_CONFIG.database}" created.`);

      connection = await mysql.createConnection(DB_CONFIG);
    } else {
      console.error(`❌ Could not connect: ${err.message}`);
      console.error(`   Using: host=${DB_CONFIG.host} user=${DB_CONFIG.user} database=${DB_CONFIG.database}`);
      console.error('   Create a .env next to this script to override (DB_HOST, DB_USER, DB_PASS, DB_NAME).');
      rl.close();
      process.exit(1);
    }
  }

  try {
    await showMenu(connection);
  } catch (err) {
    console.error('❌', err.message);
  } finally {
    rl.close();
    await connection.end();
  }
})();