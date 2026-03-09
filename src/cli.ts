#!/usr/bin/env node
import * as path from 'path';
import { convertUrlToMarkdown } from './converter';
import { urlToFilename, validateUrl, writeFile } from './utils';

const HELP = `
url-to-markdown — Convert any web page URL to a Markdown file

Usage:
  url-to-markdown <url> [options]

Options:
  -o, --output <file>     Output file path (default: derived from URL)
  --no-title              Omit the H1 heading
  --no-metadata           Omit the YAML front-matter block
  --no-images             Strip all images from output
  --no-links              Keep link text but strip hrefs
  --selector <css>        CSS selector to extract main content (e.g. "article")
  --timeout <ms>          HTTP timeout in milliseconds (default: 30000)
  -h, --help              Show this help message

Examples:
  url-to-markdown https://example.com
  url-to-markdown https://example.com/blog -o post.md
  url-to-markdown https://example.com --selector article --no-images
`.trim();

interface CliOptions {
  url: string;
  output?: string;
  includeTitle: boolean;
  includeMetadata: boolean;
  includeImages: boolean;
  includeLinks: boolean;
  contentSelector?: string;
  timeoutMs: number;
}

/**
 * Parses process.argv into a structured options object.
 * @throws {Error} if required arguments are missing or unknown flags are used.
 */
function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }

  const opts: CliOptions = {
    url: '',
    includeTitle: true,
    includeMetadata: true,
    includeImages: true,
    includeLinks: true,
    timeoutMs: 30_000,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--no-title') {
      opts.includeTitle = false;
    } else if (arg === '--no-metadata') {
      opts.includeMetadata = false;
    } else if (arg === '--no-images') {
      opts.includeImages = false;
    } else if (arg === '--no-links') {
      opts.includeLinks = false;
    } else if (arg === '--output' || arg === '-o') {
      i++;
      if (!args[i]) throw new Error(`${arg} requires a file path argument`);
      opts.output = args[i];
    } else if (arg === '--selector') {
      i++;
      if (!args[i]) throw new Error('--selector requires a CSS selector argument');
      opts.contentSelector = args[i];
    } else if (arg === '--timeout') {
      i++;
      const ms = parseInt(args[i] ?? '', 10);
      if (isNaN(ms) || ms <= 0) throw new Error('--timeout requires a positive integer (ms)');
      opts.timeoutMs = ms;
    } else if (!arg.startsWith('-')) {
      opts.url = arg;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }

    i++;
  }

  if (!opts.url) {
    throw new Error('A URL argument is required. Run with --help for usage.');
  }

  return opts;
}

/**
 * CLI entry point.
 */
async function main(): Promise<void> {
  let opts: CliOptions;
  try {
    opts = parseArgs(process.argv);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    console.error('Run with --help for usage.');
    process.exit(1);
  }

  process.stderr.write(`Fetching ${opts.url}...\n`);

  try {
    const result = await convertUrlToMarkdown(opts.url, {
      includeTitle: opts.includeTitle,
      includeMetadata: opts.includeMetadata,
      includeImages: opts.includeImages,
      includeLinks: opts.includeLinks,
      contentSelector: opts.contentSelector,
      timeoutMs: opts.timeoutMs,
    });

    let outputPath: string;
    if (opts.output) {
      outputPath = opts.output;
    } else {
      const parsedUrl = validateUrl(opts.url);
      const filename = urlToFilename(parsedUrl);
      outputPath = path.join(process.cwd(), `${filename}.md`);
    }

    const saved = writeFile(outputPath, result.markdown);
    process.stderr.write(`Saved to ${saved}\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

main();
