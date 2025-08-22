import fs from "fs";
import path from "path";
import Mustache from "mustache";
import { marked } from "marked";

export function readFile(p: string) { return fs.readFileSync(p, "utf-8"); }
export function writeFile(p: string, data: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data, "utf-8");
}
export function copyDir(src: string, dst: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
export function renderMarkdown(md: string): string {
  return marked.parse(md) as string;
}
export function renderTemplate(tpl: string, data: any, partials: Record<string,string> = {}) {
  return Mustache.render(tpl, data, partials);
}
export function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
export function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const res: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) res.push(...walk(p));
    else res.push(p);
  }
  return res;
}
