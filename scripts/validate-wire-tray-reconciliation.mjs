import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = resolve(repoRoot, "supabase", "migrations");
const targetPath = resolve(
  migrationsDirectory,
  "20260727123000_wire_tray_schema_reconciliation.sql",
);
const sourceNames = [
  "20260721133000_wire_tray_foundation.sql",
  "20260721133100_wire_tray_security.sql",
  "20260721133200_wire_tray_commands.sql",
  "20260721133300_wire_tray_fulfillment.sql",
];

const normalizeLineEndings = (value) => value.replace(/\r\n/g, "\n").trim();

function makeEnumsIdempotent(sql) {
  return sql.replace(
    /CREATE TYPE public\.([a-z0-9_]+) AS ENUM \(([\s\S]*?)\);/gi,
    (statement, enumName) => `DO $wire_type_${enumName}$
BEGIN
  IF to_regtype('public.${enumName}') IS NULL THEN
    ${statement.replace(/\n/g, "\n    ")}
  END IF;
END
$wire_type_${enumName}$;`,
  );
}

function makeTablesAndIndexesIdempotent(sql) {
  return sql
    .replace(/CREATE TABLE public\./g, "CREATE TABLE IF NOT EXISTS public.")
    .replace(
      /CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS )/g,
      (_statement, unique = "") => `CREATE ${unique}INDEX IF NOT EXISTS `,
    );
}

function makeTriggersIdempotent(sql) {
  return sql.replace(/CREATE TRIGGER\s+([a-z0-9_]+)[\s\S]*?;/gi, (statement, triggerName) => {
    const relation = statement.match(/\bON\s+((?:public|storage)\.[a-z0-9_]+)/i)?.[1];
    if (!relation) {
      throw new Error(`Could not resolve relation for trigger ${triggerName}.`);
    }
    return `DROP TRIGGER IF EXISTS ${triggerName} ON ${relation};\n${statement}`;
  });
}

function makePoliciesIdempotent(sql) {
  return sql.replace(
    /CREATE POLICY "([^"]+)"\s*\nON ((?:public|storage)\.[a-z0-9_]+)/gi,
    (statement, policyName, relation) =>
      `DROP POLICY IF EXISTS "${policyName}" ON ${relation};\n${statement}`,
  );
}

function extractEnumContract(sql) {
  const contract = [];
  for (const match of sql.matchAll(/CREATE TYPE public\.([a-z0-9_]+) AS ENUM \(([\s\S]*?)\);/gi)) {
    for (const label of match[2].matchAll(/'([^']+)'/g)) {
      contract.push([match[1], label[1]]);
    }
  }
  return contract;
}

function extractObjectNames(sql, kind) {
  const expression = new RegExp(
    `CREATE(?: OR REPLACE)? ${kind} (?:IF NOT EXISTS )?public\\.([a-z0-9_]+)`,
    "gi",
  );
  return [...sql.matchAll(expression)].map((match) => match[1]);
}

function extractTableColumnContract(sql) {
  const contract = [];
  const tableExpression = /CREATE TABLE public\.([a-z0-9_]+)\s*\(/gi;
  for (const match of sql.matchAll(tableExpression)) {
    const tableName = match[1];
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let quoted = false;
    let bodyEnd = -1;

    for (let index = bodyStart; index < sql.length; index += 1) {
      const character = sql[index];
      if (character === "'" && sql[index - 1] !== "\\") quoted = !quoted;
      if (quoted) continue;
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      if (depth === 0) {
        bodyEnd = index;
        break;
      }
    }
    if (bodyEnd < 0) throw new Error(`Could not resolve table body for ${tableName}.`);

    const definitions = [];
    let definitionStart = bodyStart;
    depth = 0;
    quoted = false;
    for (let index = bodyStart; index <= bodyEnd; index += 1) {
      const character = sql[index];
      if (character === "'" && sql[index - 1] !== "\\") quoted = !quoted;
      if (!quoted && character === "(") depth += 1;
      if (!quoted && character === ")") depth -= 1;
      if ((!quoted && depth === 0 && character === ",") || index === bodyEnd) {
        definitions.push(sql.slice(definitionStart, index).trim());
        definitionStart = index + 1;
      }
    }

    for (const definition of definitions) {
      const column = definition.match(/^"?([a-z_][a-z0-9_]*)"?\s+/i)?.[1];
      if (!column || /^(constraint|primary|unique|check|foreign|exclude)$/i.test(column)) continue;
      contract.push([tableName, column]);
    }
  }
  return contract;
}

function sqlValues(rows) {
  return rows
    .map((row) => `    (${row.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ")})`)
    .join(",\n");
}

const sourceSql = await Promise.all(
  sourceNames.map(async (name) =>
    normalizeLineEndings(await readFile(resolve(migrationsDirectory, name), "utf8")),
  ),
);

const combinedSource = sourceSql.join("\n\n");
const enumContract = extractEnumContract(combinedSource);
const tableNames = [...new Set(extractObjectNames(combinedSource, "TABLE"))];
const tableColumnContract = extractTableColumnContract(combinedSource);
const viewNames = [...new Set(extractObjectNames(combinedSource, "VIEW"))];
const functionNames = [...new Set(extractObjectNames(combinedSource, "FUNCTION"))];
const operationalTables = tableNames.filter((name) => name !== "user_module_access");

let foundation = makeEnumsIdempotent(sourceSql[0]);
foundation = makeTablesAndIndexesIdempotent(foundation);
foundation = makeTriggersIdempotent(foundation);

let security = makeTriggersIdempotent(sourceSql[1]);
security = makePoliciesIdempotent(security);
security = security.replace(
  "-- Active existing OS administrators are the only automatic bootstrap recipients.",
  `-- Remove the two temporary policies installed by the minimal access-only migration.
DROP POLICY IF EXISTS "Users read own module access" ON public.user_module_access;
DROP POLICY IF EXISTS "Admins manage module access" ON public.user_module_access;

-- Active existing OS administrators are the only automatic bootstrap recipients.`,
);

let commands = makeTablesAndIndexesIdempotent(sourceSql[2]);
commands = makeTriggersIdempotent(commands);

let fulfillment = makeTablesAndIndexesIdempotent(sourceSql[3]);
fulfillment = makeTriggersIdempotent(fulfillment);

const preflight = `-- Reconciles the access-only Leitos deployment with the complete operational schema.
-- This migration is additive: it never drops tables or deletes operational records.
BEGIN;

SELECT pg_advisory_xact_lock(hashtextextended('wire_tray_schema_reconciliation_v1', 0));

DO $wire_prerequisites$
BEGIN
  IF to_regclass('auth.users') IS NULL
     OR to_regclass('public.user_roles') IS NULL
     OR to_regclass('public.clients') IS NULL
     OR to_regclass('public.client_units') IS NULL
     OR to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL
     OR to_regprocedure('public.update_updated_at_column()') IS NULL
     OR to_regtype('public.app_role') IS NULL
     OR to_regtype('public.service_priority') IS NULL THEN
    RAISE EXCEPTION
      'Leitos Aramados requer a fundação existente de autenticação, clientes, unidades e Storage.'
      USING ERRCODE = '55000';
  END IF;
END
$wire_prerequisites$;

-- The deployed incident has only user_module_access. A partially-created operational
-- group is quarantined instead of being overwritten because it may contain records
-- whose constraints cannot be inferred safely.
DO $wire_partial_guard$
DECLARE
  existing_operational_tables integer;
BEGIN
  SELECT count(*)
  INTO existing_operational_tables
  FROM (VALUES
${sqlValues(operationalTables.map((name) => [name]))}
  ) AS expected(name)
  WHERE to_regclass('public.' || expected.name) IS NOT NULL;

  IF existing_operational_tables NOT IN (0, ${operationalTables.length}) THEN
    RAISE EXCEPTION
      'Foi detectada uma implantação operacional parcial de Leitos Aramados (% de ${operationalTables.length} tabelas). A reconciliação foi interrompida sem alterar registros.',
      existing_operational_tables
      USING ERRCODE = '55000';
  END IF;
END
$wire_partial_guard$;`;

const enumVerification = `DO $wire_enum_contract$
DECLARE
  missing_labels text[];
BEGIN
  SELECT array_agg(expected.type_name || '.' || expected.label ORDER BY expected.type_name, expected.label)
  INTO missing_labels
  FROM (VALUES
${sqlValues(enumContract)}
  ) AS expected(type_name, label)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'
      AND t.typname = expected.type_name
      AND e.enumlabel = expected.label
  );

  IF missing_labels IS NOT NULL THEN
    RAISE EXCEPTION 'Enums incompatíveis em Leitos Aramados: %', array_to_string(missing_labels, ', ')
      USING ERRCODE = '55000';
  END IF;
END
$wire_enum_contract$;`;

const verification = `-- Views must execute with the caller permissions so base-table RLS is never bypassed.
ALTER VIEW public.wire_tray_projected_inventory SET (security_invoker = true);
ALTER VIEW public.wire_tray_inventory_catalog SET (security_invoker = true);

DO $wire_schema_contract$
DECLARE
  missing_objects text[];
  missing_columns text[];
  rls_disabled text[];
BEGIN
  SELECT array_agg(expected.kind || ':' || expected.name ORDER BY expected.kind, expected.name)
  INTO missing_objects
  FROM (VALUES
${sqlValues([
  ...tableNames.map((name) => ["table", name]),
  ...viewNames.map((name) => ["view", name]),
  ...functionNames.map((name) => ["function", name]),
])}
  ) AS expected(kind, name)
  WHERE CASE expected.kind
    WHEN 'table' THEN to_regclass('public.' || expected.name) IS NULL
    WHEN 'view' THEN to_regclass('public.' || expected.name) IS NULL
    WHEN 'function' THEN NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = expected.name
    )
    ELSE true
  END;

  IF missing_objects IS NOT NULL THEN
    RAISE EXCEPTION 'Objetos ausentes após reconciliação: %', array_to_string(missing_objects, ', ')
      USING ERRCODE = '55000';
  END IF;

  SELECT array_agg(expected.table_name || '.' || expected.column_name ORDER BY expected.table_name, expected.column_name)
  INTO missing_columns
  FROM (VALUES
${sqlValues(tableColumnContract)}
  ) AS expected(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = expected.table_name
      AND c.column_name = expected.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Colunas ausentes apÃ³s reconciliaÃ§Ã£o: %', array_to_string(missing_columns, ', ')
      USING ERRCODE = '55000';
  END IF;

  SELECT array_agg(expected.name ORDER BY expected.name)
  INTO rls_disabled
  FROM (VALUES
${sqlValues(tableNames.map((name) => [name]))}
  ) AS expected(name)
  JOIN pg_class c ON c.oid = to_regclass('public.' || expected.name)
  WHERE NOT c.relrowsecurity;

  IF rls_disabled IS NOT NULL THEN
    RAISE EXCEPTION 'RLS desabilitada após reconciliação: %', array_to_string(rls_disabled, ', ')
      USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'wire-tray-documents' AND public = false
  ) THEN
    RAISE EXCEPTION 'Bucket privado de Leitos Aramados não foi reconciliado.'
      USING ERRCODE = '55000';
  END IF;
END
$wire_schema_contract$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

COMMIT;`;

const generated = `${preflight}

-- Source: ${sourceNames[0]}
${foundation}

${enumVerification}

-- Source: ${sourceNames[1]}
${security}

-- Source: ${sourceNames[2]}
${commands}

-- Source: ${sourceNames[3]}
${fulfillment}

${verification}
`;

if (process.argv.includes("--write")) {
  await writeFile(targetPath, generated, "utf8");
  console.log(`Updated ${targetPath}`);
} else {
  const current = normalizeLineEndings(await readFile(targetPath, "utf8"));
  if (current !== normalizeLineEndings(generated)) {
    throw new Error(
      "The reconciliation migration is stale. Run `node scripts/validate-wire-tray-reconciliation.mjs --write`.",
    );
  }
  console.log("WIRE_TRAY_RECONCILIATION_UP_TO_DATE");
}
