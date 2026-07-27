import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = resolve(repoRoot, "src", "integrations", "supabase", "types.ts");
const sourceArgument = process.argv.find((argument) => argument.startsWith("--source="));
const write = process.argv.includes("--write");

if (!sourceArgument) {
  throw new Error(
    "Informe --source=<types.ts> com a saída gerada pelo Supabase a partir do schema reconciliado.",
  );
}

const sourcePath = resolve(repoRoot, sourceArgument.slice("--source=".length));
const [currentTypes, generatedTypes] = await Promise.all([
  readFile(targetPath, "utf8"),
  readFile(sourcePath, "utf8"),
]);

function findSection(source, sectionName, from = 0) {
  const marker = `    ${sectionName}: {`;
  const start = source.indexOf(marker, from);
  if (start < 0) throw new Error(`Seção ${sectionName} não encontrada.`);
  const contentStart = start + marker.length;
  const contentEnd = source.indexOf("\n    }", contentStart);
  if (contentEnd < 0) throw new Error(`Fim da seção ${sectionName} não encontrado.`);
  return { start, contentStart, contentEnd, end: contentEnd + "\n    }".length };
}

function parseEntries(source, bounds) {
  const content = source.slice(bounds.contentStart, bounds.contentEnd);
  const matches = [...content.matchAll(/^      ([a-zA-Z0-9_]+):/gm)];
  const entries = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const block = content.slice(match.index, next?.index ?? content.length).trimEnd();
    entries.set(match[1], block);
  }
  return entries;
}

function replaceSection(target, source, sectionName, predicate, targetFrom = 0, sourceFrom = 0) {
  const targetBounds = findSection(target, sectionName, targetFrom);
  const sourceBounds = findSection(source, sectionName, sourceFrom);
  const targetEntries = parseEntries(target, targetBounds);
  const sourceEntries = parseEntries(source, sourceBounds);
  const expectedNames = [...sourceEntries.keys()].filter(predicate);

  if (expectedNames.length === 0) {
    throw new Error(`Nenhum objeto de Leitos encontrado em ${sectionName}.`);
  }
  for (const name of expectedNames) targetEntries.set(name, sourceEntries.get(name));

  const blocks = [...targetEntries.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, block]) => block);
  const replacement = `    ${sectionName}: {\n${blocks.join("\n")}\n    }`;
  return {
    value: `${target.slice(0, targetBounds.start)}${replacement}${target.slice(targetBounds.end)}`,
    expectedNames,
  };
}

function sectionMismatches(target, source, sectionName, predicate, targetFrom = 0, sourceFrom = 0) {
  const targetEntries = parseEntries(target, findSection(target, sectionName, targetFrom));
  const sourceEntries = parseEntries(source, findSection(source, sectionName, sourceFrom));
  const canonical = (value) => value?.replace(/\s+/g, "").replace(/:\|/g, ":").replace(/,\]/g, "]");
  return [...sourceEntries.entries()]
    .filter(([name]) => predicate(name))
    .filter(([name, block]) => canonical(targetEntries.get(name)) !== canonical(block))
    .map(([name]) => `${sectionName}:${name}`);
}

const databaseStart = currentTypes.indexOf("export type Database = {");
const generatedDatabaseStart = generatedTypes.indexOf("export type Database = {");
if (databaseStart < 0 || generatedDatabaseStart < 0) {
  throw new Error("A saída informada não contém o tipo Database do Supabase.");
}

let synchronized = currentTypes;
const synchronizedNames = [];
for (const sectionName of ["Tables", "Views", "Functions", "Enums"]) {
  const predicate =
    sectionName === "Tables"
      ? (name) => name === "user_module_access" || name.startsWith("wire_tray_")
      : sectionName === "Enums"
        ? (name) => name === "app_module" || name.startsWith("wire_tray_")
        : (name) => name.startsWith("wire_tray_");
  const result = replaceSection(
    synchronized,
    generatedTypes,
    sectionName,
    predicate,
    databaseStart,
    generatedDatabaseStart,
  );
  synchronized = result.value;
  synchronizedNames.push(...result.expectedNames.map((name) => `${sectionName}:${name}`));
}

const constantsStart = synchronized.indexOf("export const Constants = {");
const generatedConstantsStart = generatedTypes.indexOf("export const Constants = {");
if (constantsStart < 0 || generatedConstantsStart < 0) {
  throw new Error("A saída informada não contém Constants do Supabase.");
}
const constantsResult = replaceSection(
  synchronized,
  generatedTypes,
  "Enums",
  (name) => name === "app_module" || name.startsWith("wire_tray_"),
  constantsStart,
  generatedConstantsStart,
);
synchronized = constantsResult.value;
synchronizedNames.push(...constantsResult.expectedNames.map((name) => `Constants:${name}`));

const currentConstantsStart = currentTypes.indexOf("export const Constants = {");
const sourceConstantsStart = generatedTypes.indexOf("export const Constants = {");
const mismatches = ["Tables", "Views", "Functions", "Enums"].flatMap((sectionName) => {
  const predicate =
    sectionName === "Tables"
      ? (name) => name === "user_module_access" || name.startsWith("wire_tray_")
      : sectionName === "Enums"
        ? (name) => name === "app_module" || name.startsWith("wire_tray_")
        : (name) => name.startsWith("wire_tray_");
  return sectionMismatches(
    currentTypes,
    generatedTypes,
    sectionName,
    predicate,
    databaseStart,
    generatedDatabaseStart,
  );
});
mismatches.push(
  ...sectionMismatches(
    currentTypes,
    generatedTypes,
    "Enums",
    (name) => name === "app_module" || name.startsWith("wire_tray_"),
    currentConstantsStart,
    sourceConstantsStart,
  ).map((name) => `Constants:${name}`),
);

if (write) {
  await writeFile(targetPath, synchronized, "utf8");
  console.log(`WIRE_TRAY_TYPES_UPDATED ${synchronizedNames.length}`);
} else if (mismatches.length > 0) {
  throw new Error(
    `Os tipos de Leitos Aramados estão divergentes (${mismatches.join(", ")}). Execute novamente com --write após validar a origem.`,
  );
} else {
  console.log(`WIRE_TRAY_TYPES_UP_TO_DATE ${synchronizedNames.length}`);
}
