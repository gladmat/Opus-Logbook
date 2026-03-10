import { TextDecoder, TextEncoder } from "util";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const ROOT_CACHE = "file:///cache";
const ROOT_DOCUMENT = "file:///document";

const directories = new Set<string>();
const files = new Map<string, Uint8Array>();

function normalizeUri(...parts: (string | { uri: string })[]): string {
  const stringParts = parts.map((part) =>
    typeof part === "string" ? part : part.uri,
  );
  const [first = ""] = stringParts;

  if (stringParts.length === 1 && first.startsWith("file://")) {
    return first.replace(/\/+$/, "") || first;
  }

  const stripped = stringParts
    .map((part, index) =>
      index === 0 ? part.replace(/\/+$/, "") : part.replace(/^\/+|\/+$/g, ""),
    )
    .filter(Boolean);

  return stripped.join("/");
}

function dirname(uri: string): string {
  const trimmed = uri.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx <= "file://".length ? trimmed : trimmed.slice(0, idx);
}

function basename(uri: string): string {
  return uri.replace(/\/+$/, "").split("/").pop() || "";
}

function extname(uri: string): string {
  const name = basename(uri);
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx);
}

function ensureDirectory(uri: string): void {
  if (directories.has(uri)) return;
  const parent = dirname(uri);
  if (parent && parent !== uri) {
    ensureDirectory(parent);
  }
  directories.add(uri);
}

function listChildren(uri: string): string[] {
  const results = new Set<string>();

  for (const dir of directories) {
    if (dir !== uri && dirname(dir) === uri) {
      results.add(dir);
    }
  }

  for (const fileUri of files.keys()) {
    if (dirname(fileUri) === uri) {
      results.add(fileUri);
    }
  }

  return [...results];
}

function deleteDirectoryRecursive(uri: string): void {
  for (const fileUri of [...files.keys()]) {
    if (fileUri === uri || fileUri.startsWith(`${uri}/`)) {
      files.delete(fileUri);
    }
  }

  for (const dir of [...directories]) {
    if (dir === uri || dir.startsWith(`${uri}/`)) {
      directories.delete(dir);
    }
  }
}

function cloneBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

export class Directory {
  readonly uri: string;

  constructor(...uris: (string | File | Directory)[]) {
    this.uri = normalizeUri(...uris);
  }

  get exists(): boolean {
    return directories.has(this.uri);
  }

  create(options?: {
    intermediates?: boolean;
    idempotent?: boolean;
    overwrite?: boolean;
  }): void {
    if (this.exists) {
      if (options?.overwrite) {
        deleteDirectoryRecursive(this.uri);
      } else if (!options?.idempotent) {
        return;
      }
    }

    if (options?.intermediates) {
      ensureDirectory(this.uri);
      return;
    }

    const parent = dirname(this.uri);
    if (parent && !directories.has(parent)) {
      throw new Error(`Parent directory does not exist: ${parent}`);
    }
    directories.add(this.uri);
  }

  delete(): void {
    deleteDirectoryRecursive(this.uri);
  }

  list(): (Directory | File)[] {
    return listChildren(this.uri).map((child) =>
      directories.has(child) ? new Directory(child) : new File(child),
    );
  }

  get size(): number | null {
    if (!this.exists) return null;

    let total = 0;
    for (const [fileUri, content] of files.entries()) {
      if (dirname(fileUri) === this.uri || fileUri.startsWith(`${this.uri}/`)) {
        total += content.length;
      }
    }
    return total;
  }

  get name(): string {
    return basename(this.uri);
  }

  move(destination: Directory | File): void {
    const nextUri = destination.uri;
    const children = [...files.entries()].filter(
      ([fileUri]) => fileUri === this.uri || fileUri.startsWith(`${this.uri}/`),
    );
    const subdirs = [...directories].filter(
      (dir) => dir === this.uri || dir.startsWith(`${this.uri}/`),
    );

    deleteDirectoryRecursive(this.uri);
    ensureDirectory(nextUri);

    for (const dir of subdirs) {
      directories.add(dir.replace(this.uri, nextUri));
    }
    for (const [fileUri, content] of children) {
      files.set(fileUri.replace(this.uri, nextUri), cloneBytes(content));
    }

    (this as { uri: string }).uri = nextUri;
  }
}

export class File {
  readonly uri: string;

  constructor(...uris: (string | File | Directory)[]) {
    this.uri = normalizeUri(...uris);
  }

  get parentDirectory(): Directory {
    return new Directory(dirname(this.uri));
  }

  get extension(): string {
    return extname(this.uri);
  }

  get name(): string {
    return basename(this.uri);
  }

  get exists(): boolean {
    return files.has(this.uri);
  }

  get size(): number {
    return files.get(this.uri)?.length ?? 0;
  }

  get type(): string {
    return this.extension === ".png" ? "image/png" : "image/jpeg";
  }

  get md5(): string | null {
    return null;
  }

  get contentUri(): string {
    return this.uri;
  }

  async text(): Promise<string> {
    return this.textSync();
  }

  textSync(): string {
    const content = files.get(this.uri);
    if (!content) throw new Error(`Missing file: ${this.uri}`);
    return decoder.decode(content);
  }

  async bytes(): Promise<Uint8Array> {
    return this.bytesSync();
  }

  bytesSync(): Uint8Array {
    const content = files.get(this.uri);
    if (!content) throw new Error(`Missing file: ${this.uri}`);
    return cloneBytes(content);
  }

  write(content: string | Uint8Array): void {
    ensureDirectory(dirname(this.uri));
    files.set(
      this.uri,
      typeof content === "string"
        ? encoder.encode(content)
        : cloneBytes(content),
    );
  }

  create(options?: { intermediates?: boolean; overwrite?: boolean }): void {
    if (this.exists && !options?.overwrite) {
      throw new Error(`File exists: ${this.uri}`);
    }
    if (options?.intermediates) {
      ensureDirectory(dirname(this.uri));
    } else if (!directories.has(dirname(this.uri))) {
      throw new Error(`Parent directory does not exist: ${dirname(this.uri)}`);
    }
    files.set(this.uri, new Uint8Array());
  }

  delete(): void {
    files.delete(this.uri);
  }

  move(destination: Directory | File): void {
    const content = files.get(this.uri);
    if (!content) {
      throw new Error(`Missing file: ${this.uri}`);
    }
    ensureDirectory(dirname(destination.uri));
    files.set(destination.uri, cloneBytes(content));
    files.delete(this.uri);
    (this as { uri: string }).uri = destination.uri;
  }
}

export class Paths {
  static get cache(): Directory {
    return new Directory(ROOT_CACHE);
  }

  static get document(): Directory {
    return new Directory(ROOT_DOCUMENT);
  }
}

export function resetMockExpoFileSystem(): void {
  directories.clear();
  files.clear();
  directories.add(ROOT_CACHE);
  directories.add(ROOT_DOCUMENT);
}

export function writeMockFile(uri: string, content: Uint8Array | string): void {
  const file = new File(uri);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  file.write(content);
}

export function readMockFileText(uri: string): string {
  return new File(uri).textSync();
}

export function readMockFileBytes(uri: string): Uint8Array {
  return new File(uri).bytesSync();
}

export function mockFileExists(uri: string): boolean {
  return new File(uri).exists;
}

resetMockExpoFileSystem();

export function createExpoFileSystemMock() {
  return {
    File,
    Directory,
    Paths,
  };
}
