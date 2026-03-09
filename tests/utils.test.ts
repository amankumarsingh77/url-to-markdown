import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildMetadataBlock, urlToFilename, validateUrl, writeFile } from '../src/utils';

describe('validateUrl', () => {
  it('returns a URL object for a valid http URL', () => {
    const result = validateUrl('http://example.com');
    expect(result).toBeInstanceOf(URL);
    expect(result.hostname).toBe('example.com');
  });

  it('returns a URL object for a valid https URL', () => {
    const result = validateUrl('https://example.com/path?q=1');
    expect(result.protocol).toBe('https:');
    expect(result.pathname).toBe('/path');
  });

  it('throws for a non-URL string', () => {
    expect(() => validateUrl('not-a-url')).toThrow('Invalid URL');
  });

  it('throws for an empty string', () => {
    expect(() => validateUrl('')).toThrow('Invalid URL');
  });

  it('throws for an ftp:// URL', () => {
    expect(() => validateUrl('ftp://example.com')).toThrow('Unsupported protocol');
  });

  it('throws for a file:// URL', () => {
    expect(() => validateUrl('file:///etc/passwd')).toThrow('Unsupported protocol');
  });
});

describe('urlToFilename', () => {
  it('converts a simple URL to a safe filename', () => {
    const url = new URL('https://example.com/');
    expect(urlToFilename(url)).toBe('example.com');
  });

  it('converts a URL with a path', () => {
    const url = new URL('https://example.com/blog/my-post');
    expect(urlToFilename(url)).toBe('example.com-blog-my-post');
  });

  it('replaces special characters with hyphens', () => {
    const url = new URL('https://example.com/path?q=foo');
    const result = urlToFilename(url);
    // query string is not part of pathname, so result is just the path
    expect(result).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('collapses consecutive hyphens', () => {
    const url = new URL('https://example.com/a//b');
    const result = urlToFilename(url);
    expect(result).not.toMatch(/-{2,}/);
  });

  it('does not start or end with a hyphen', () => {
    const url = new URL('https://example.com/');
    const result = urlToFilename(url);
    expect(result).not.toMatch(/^-|-$/);
  });
});

describe('writeFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'url-to-md-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes content to the specified file', () => {
    const filePath = path.join(tmpDir, 'output.md');
    writeFile(filePath, '# Hello');
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('# Hello');
  });

  it('creates parent directories as needed', () => {
    const filePath = path.join(tmpDir, 'nested', 'deep', 'output.md');
    writeFile(filePath, 'content');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('returns the absolute path of the written file', () => {
    const filePath = path.join(tmpDir, 'out.md');
    const returned = writeFile(filePath, 'hi');
    expect(path.isAbsolute(returned)).toBe(true);
    expect(returned).toBe(path.resolve(filePath));
  });

  it('overwrites existing file content', () => {
    const filePath = path.join(tmpDir, 'out.md');
    writeFile(filePath, 'original');
    writeFile(filePath, 'updated');
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('updated');
  });
});

describe('buildMetadataBlock', () => {
  it('returns a valid YAML front-matter block', () => {
    const block = buildMetadataBlock('My Title', 'https://example.com', '2024-01-01T00:00:00.000Z');
    expect(block).toContain('---');
    expect(block).toContain('title: "My Title"');
    expect(block).toContain('url: https://example.com');
    expect(block).toContain('fetched_at: 2024-01-01T00:00:00.000Z');
  });

  it('escapes double quotes in the title', () => {
    const block = buildMetadataBlock('Say "Hello"', 'https://example.com', '2024-01-01T00:00:00.000Z');
    expect(block).toContain('title: "Say \\"Hello\\""');
  });

  it('starts and ends with ---', () => {
    const block = buildMetadataBlock('T', 'https://u.com', '2024-01-01T00:00:00.000Z');
    const lines = block.split('\n');
    expect(lines[0]).toBe('---');
    expect(lines[lines.length - 2]).toBe('---');
  });
});
