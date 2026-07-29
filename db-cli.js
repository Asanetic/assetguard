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

// Serializes a field descriptor object (from classifySmartField, or the
// system-field shape below) into a single schema.js field-entry line.
function serializeFieldEntry(field) {
  const parts = Object.entries(field).map(([k, v]) => (typeof v === 'string' ? `${k}: '${v}'` : `${k}: ${v}`));
  return `{ ${parts.join(', ')} },`;
}

function buildFieldEntry(col, apiBase) {
  const field = classifySmartField(col, apiBase);
  if (!field) return null; // sensitive column — dropped entirely
  return serializeFieldEntry(field);
}

function buildSystemFieldEntry(col) {
  const type = sqlTypeToFieldType(col.Type);
  return serializeFieldEntry({ key: col.Field, label: toLabel(col.Field), type, system: true, editable: false });
}

async function interactiveBuildSchema(connection) {
  const tableName = await pickExistingTable(connection, 'Pick a table to introspect (number): ');
  if (!tableName) return console.log('Cancelled.');

  const defaultModuleName = tableName.replace(/_/g, '');
  const defaultAppNamespace = path.basename(__dirname);
  const defaultApiBase = `/api/${defaultAppNamespace}/${defaultModuleName}`;

  console.log(`\nDefaults for "${tableName}":`);
  console.log(`  moduleName  = ${defaultModuleName}`);
  console.log(`  appNamespace = ${defaultAppNamespace}`);
  console.log(`  apiBase     = ${defaultApiBase}`);

  let moduleName = defaultModuleName;
  let appNamespace = defaultAppNamespace;
  let apiBase = defaultApiBase;

  if (!(await askYesNoDefaultYes('Use these? (Enter = yes, n = edit one at a time) '))) {
    moduleName = (await ask(`Module name (variable/folder name) [${defaultModuleName}]: `)) || defaultModuleName;
    const appNamespaceInput = await ask(`App namespace [${defaultAppNamespace}] (type "-" for none): `);
    appNamespace = appNamespaceInput === '-' ? '' : (appNamespaceInput || defaultAppNamespace);
    const recomputedApiBase = appNamespace ? `/api/${appNamespace}/${moduleName}` : `/api/${moduleName}`;
    apiBase = (await ask(`apiBase [${recomputedApiBase}]: `)) || recomputedApiBase;
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

  const systemFieldLines = [buildSystemFieldEntry(primkeyColumn), buildSystemFieldEntry(recordIdColumn)];

  const LIST_COLUMN_COUNT = 7;
  const showInListKeys = ['row_count',...columns.slice(0, LIST_COLUMN_COUNT).map((c) => c.Field)];

  // Same positional split feeds `sections`: first LIST_COLUMN_COUNT real
  // columns -> "Basic Information", everything else -> "Other Details".
  // Hand-tune this afterward same as you always have — this just gets the
  // rough cut in place instantly.
  const basicSectionKeys = columns.slice(0, LIST_COLUMN_COUNT).map((c) => c.Field);
  const otherSectionKeys = columns.slice(LIST_COLUMN_COUNT).map((c) => c.Field);

  const computedDefaultFieldLines = [
    `{ key: 'row_count', label: '#', type: 'number', computed: true, editable: false },`,
  ];

  const fieldLines = [
    ...systemFieldLines,
    ...columns.map((c) => buildFieldEntry(c, apiBase)).filter(Boolean),
    ...computedDefaultFieldLines,
  ];
  const fieldKeys = [
    `${primkeyColumn.Field} (system)`,
    `${recordIdColumn.Field} (system)`,
    ...columns.map((c) => `${c.Field}${showInListKeys.includes(c.Field) ? ' (list)' : ''}`),
    'row_count (computed, list)',
  ];

  console.log(`\n📋 Showing in list view (first ${LIST_COLUMN_COUNT} + row_count): ${showInListKeys.join(', ')}`);
  console.log(`\nFound ${fieldLines.length} field(s) for "${tableName}" (includes ${primkeyColumn.Field}, ${recordIdColumn.Field}, row_count): ${fieldKeys.join(', ')}`);
  console.log('You can add more extra display-only fields now — any other computed');
  console.log('value the backend adds that isn\'t an actual DB column.\n');

  while (await askYesNo('Add an extra (computed, non-DB) field? (y/n) ')) {
    const key = await ask('  Field key: ');
    if (!key) { console.log('  Skipped — no key given.'); continue; }
    const label = (await ask(`  Label [${toLabel(key)}]: `)) || toLabel(key);
    fieldLines.push(`{ key: '${key}', label: '${label}', type: 'text', computed: true },`);
    fieldKeys.push(`${key} (computed)`);
    console.log(`  ✅ added: ${key} (computed: true — won't be written to the DB)`);

    if (await askYesNo(`  Also show "${key}" in list view? (y/n) `)) {
      showInListKeys.push(key);
      console.log(`  ✅ added "${key}" to showInList`);
    }

    console.log(`  Current field list: ${fieldKeys.join(', ')}\n`);
  }

  console.log(`\n📋 Final field list (${fieldLines.length} total): ${fieldKeys.join(', ')}`);
  console.log(`📋 Final showInList: [${showInListKeys.join(', ')}]`);

  const fieldLinesFormatted = fieldLines.map((line) => '    ' + line).join('\n');
  const showInListLiteral = `[${showInListKeys.map((k) => `'${k}'`).join(', ')}]`;
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

  const schemaJs = `// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.
// Rough cut auto-generated by db-cli.js (rule-based column-name matching,
// no AI) — hand-tune sections/profileActions/groupedSelect below same as
// any other cloned module.

export const ${toPascalCase(moduleName)}Schema = {
  entity: '${tableName}',              // DB table name; also drives default role names
                                     // (view_${moduleName} / manage_${moduleName}) and apiBase
  label: '${label}',                 // optional, defaults to entity capitalized
  apiBase: '${apiBase}',

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

  // Field keys shown as columns in list view, in display order.
  showInList: ${showInListLiteral},

  rowLinks: [],

  // profileActions — one array, three possible places each entry can
  // render, spelled out explicitly on every entry (no implicit
  // defaults): the grid, DynamicForm.jsx, and EntityRowOptions' dropdown
  // all read this SAME array, each filtering on its own flag. Comment an
  // entry out, or flip a flag to false, and it disappears from that one
  // place — no component edit needed.
  //   grid: true/false      -> grid toolbar (list page)
  //   form: true/false      -> profile/form toolbar ('save' is also the
  //                            primary submit button — DynamicForm picks
  //                            the submit button as whichever entry has
  //                            both form:true and key:'save')
  //   rowAction: true/false -> per-row dropdown in the grid (EntityRowOptions)
  //   editOnly: true        -> only shown once a record exists (form/rowAction contexts)
  //   role: 'role_name'     -> UI-ONLY gate, checked via mosyACTRLHasRole
  //                            (session roles from localStorage). Omit
  //                            entirely and the action is open to anyone —
  //                            this is additive, not a default-deny system.
  //                            NOTE: this does not by itself stop the
  //                            request server-side — route.js currently
  //                            gates every mutation behind one blanket
  //                            manage_<entity> role regardless of which
  //                            action triggered it. Real enforcement needs
  //                            the same per-action role checked there too.
  profileActions: [
    { key: 'back', label: 'Back to list', icon: 'arrow-left', variant: 'outline-secondary', navigateTo: '/${appNamespace ? appNamespace + '/' : ''}${moduleName}/list', grid: false, form: true },
    { key: 'save', label: 'Save', icon: 'save', variant: 'primary', grid: false, form: true, rowAction: false },
    { key: 'delete', label: 'Delete', icon: 'trash', variant: 'outline-danger', confirm: 'Are you sure you want to delete this ${singular}?', editOnly: true, grid: false, form: true, rowAction: true, role: 'manage_${moduleName}' },
    { key: 'view', label: 'View more', icon: 'edit', rowAction: true },
    { key: 'new', label: 'New ${label.replace(/s$/, '')}', icon: 'plus', variant: 'outline-primary', navigateTo: '/${appNamespace ? appNamespace + '/' : ''}${moduleName}/profile', grid: true, form: false, rowAction: false },
    //{ key: 'clone', label: 'Clone Record', icon: 'copy', variant: 'outline-secondary', editOnly: true, grid: false, form: true, rowAction: false, role: 'manage_${moduleName}' },
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

${sectionsBlock}

  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
${fieldLinesFormatted}
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

  // Optional: joins enriching each row with data from another table.
  // Same shape as your existing *BatchMutations.js files.
  batchMutations: {
    // "_staff_full_name_staff_id": {
    //   type: "join", table: "staff", link: "staff_id:record_id",
    //   select: { "_staff_full_name_staff_id": "full_name" }
    // },
  },

  // Optional: only needed if permission keys don't follow the
  // view_<entity> / manage_<entity> default.
  // roles: { view: 'view_${moduleName}', manage: 'manage_${moduleName}' },
};
`;

  console.log('\n' + schemaJs);

  const frontendOutPath = appNamespace
  ? path.join(__dirname, 'app', appNamespace, moduleName, 'schema.js')
  : path.join(__dirname, 'app', moduleName, 'schema.js');

const apiOutPath = appNamespace
  ? path.join(__dirname, 'app', 'api', appNamespace, moduleName, 'schema.js')
  : path.join(__dirname, 'app', 'api', moduleName, 'schema.js');

console.log('\nWill write schema.js to:');
console.log(`  1. ${path.relative(__dirname, frontendOutPath)}`);
console.log(`  2. ${path.relative(__dirname, apiOutPath)}`);

const writeChoice = await ask('Write to both? (y = both / f = frontend only / a = api only / - = skip): ');

const targets = [];
if (writeChoice === '' || writeChoice.toLowerCase() === 'y') {
  targets.push(frontendOutPath, apiOutPath);
} else if (writeChoice.toLowerCase() === 'f') {
  targets.push(frontendOutPath);
} else if (writeChoice.toLowerCase() === 'a') {
  targets.push(apiOutPath);
} else if (writeChoice === '-') {
  return console.log('Not written — copy the output above manually if needed.');
} else {
  return console.log('Not written — unrecognized choice.');
}

const RUN_TIMESTAMP = buildRunTimestamp();

for (const outPath of targets) {
  if (fs.existsSync(outPath)) {
    backupExistingFile(outPath, RUN_TIMESTAMP);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, schemaJs);
  console.log(`✅ Written to ${path.relative(__dirname, outPath)}`);
}

}

/* ================= MENU ================= */

async function showMenu(connection) {
  console.log(`
What do you want to do?
  --- Structure ---
  1. Create table
  2. Add column
  3. Drop column
  4. List columns
  --- Code ---
  5. Build schema.js from a table
  --- Settings ---
  6. View/edit .env
  7. Exit
`);
  const choice = await ask('Pick a number: ');

  if (choice === '1') await interactiveCreateTable(connection);
  else if (choice === '2') await interactiveAddColumn(connection);
  else if (choice === '3') await interactiveDropColumn(connection);
  else if (choice === '4') await interactiveListColumns(connection);
  else if (choice === '5') await interactiveBuildSchema(connection);
  else if (choice === '6') await interactiveViewEditEnv();
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