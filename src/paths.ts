import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function homeDir(): string {
  return process.env.KEEPFIRE_HOME?.trim() || path.join(os.homedir(), ".keepfire");
}

export function cardsDir(root = homeDir()): string {
  return path.join(root, "cards");
}

export function indexPath(root = homeDir()): string {
  return path.join(root, "index.json");
}

export function configPath(root = homeDir()): string {
  return path.join(root, "config.json");
}

export function journalPath(root = homeDir()): string {
  return path.join(root, "journal.jsonl");
}

export function packageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist/ -> package root; src/ during tsx dev -> package root
  return path.resolve(here, "..");
}

export function skillSourceDir(): string {
  return packageRoot();
}
