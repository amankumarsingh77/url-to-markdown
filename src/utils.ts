import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates that the given string is a well-formed HTTP/HTTPS URL.
 *
 * @throws {Error} if the URL is invalid or uses an unsupported protocol
 */
export function validateUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: "${rawUrl}"`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Unsupported protocol "${parsed.protocol}". Only http and https are supported.`,
    );
  }

  return parsed;
}

/**
 * Derives a safe filename (without extension) from a URL.
 * Uses the hostname + pathname, replacing non-alphanumeric chars with hyphens.
 *
 * @example
 *   urlToFilename('https://example.com/blog/my-post') → 'example.com-blog-my-post'
 */
export function urlToFilename(url: URL): string {
  const raw = `${url.hostname}${url.pathname}`;
  return raw
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Writes `content` to `filePath`, creating parent directories as needed.
 *
 * @returns The absolute path to the written file.
 */
export function writeFile(filePath: string, content: string): string {
  const absolutePath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf-8');
  return absolutePath;
}

/**
 * Builds a Markdown front-matter / metadata block.
 */
export function buildMetadataBlock(title: string, url: string, fetchedAt: string): string {
  return [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `url: ${url}`,
    `fetched_at: ${fetchedAt}`,
    '---',
    '',
  ].join('\n');
}
