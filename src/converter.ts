import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { ConversionOptions, ConversionResult } from './types';
import { buildMetadataBlock, validateUrl } from './utils';

const DEFAULT_OPTIONS: Required<Omit<ConversionOptions, 'contentSelector' | 'headers'>> = {
  includeTitle: true,
  includeMetadata: true,
  includeImages: true,
  includeLinks: true,
  timeoutMs: 30_000,
};

/** Elements considered boilerplate that should be removed before conversion */
const BOILERPLATE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'nav',
  'footer',
  'header',
  'aside',
  '[role="banner"]',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="contentinfo"]',
  '.sidebar',
  '.advertisement',
  '.ads',
  '.cookie-banner',
  '#cookie-banner',
].join(', ');

/**
 * Converts web page URLs to properly formatted Markdown.
 *
 * @example
 * ```typescript
 * const converter = new UrlToMarkdownConverter({ includeMetadata: true });
 * const result = await converter.convert('https://example.com');
 * console.log(result.markdown);
 * ```
 */
export class UrlToMarkdownConverter {
  private readonly options: Required<Omit<ConversionOptions, 'contentSelector' | 'headers'>> &
    Pick<ConversionOptions, 'contentSelector' | 'headers'>;

  constructor(options: ConversionOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      contentSelector: options.contentSelector,
      headers: options.headers,
      includeTitle: options.includeTitle ?? DEFAULT_OPTIONS.includeTitle,
      includeMetadata: options.includeMetadata ?? DEFAULT_OPTIONS.includeMetadata,
      includeImages: options.includeImages ?? DEFAULT_OPTIONS.includeImages,
      includeLinks: options.includeLinks ?? DEFAULT_OPTIONS.includeLinks,
      timeoutMs: options.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs,
    };
  }

  /**
   * Configures a TurndownService instance according to the current options.
   */
  private setupTurndown(): TurndownService {
    const td = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    td.use(gfm);

    if (!this.options.includeImages) {
      td.addRule('strip-images', {
        filter: 'img',
        replacement: () => '',
      });
    }

    if (!this.options.includeLinks) {
      td.addRule('strip-links', {
        filter: 'a',
        replacement: (content) => content,
      });
    }

    return td;
  }

  /**
   * Extracts the page title from the parsed HTML.
   * Priority: <title> → first <h1> → 'Untitled'
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    const titleTag = $('title').first().text().trim();
    if (titleTag) return titleTag.replace(/\s+/g, ' ');

    const h1 = $('h1').first().text().trim();
    if (h1) return h1.replace(/\s+/g, ' ');

    return 'Untitled';
  }

  /**
   * Extracts the main content HTML from the page.
   * Uses `contentSelector` if provided, otherwise strips boilerplate from the body.
   *
   * @throws {Error} if `contentSelector` is set but matches no elements.
   */
  private extractContent($: cheerio.CheerioAPI): string {
    if (this.options.contentSelector) {
      const selected = $(this.options.contentSelector).first();
      if (!selected.length) {
        throw new Error(
          `Content selector "${this.options.contentSelector}" matched no elements on the page.`,
        );
      }
      return $.html(selected) ?? '';
    }

    // Remove boilerplate elements
    $(BOILERPLATE_SELECTORS).remove();

    return $('body').html() ?? '';
  }

  /**
   * Fetches the given URL and converts its HTML content to Markdown.
   *
   * @param rawUrl - The URL to fetch and convert.
   * @returns A {@link ConversionResult} containing the Markdown and metadata.
   * @throws {Error} on invalid URL, non-HTML content type, or HTTP error.
   */
  public async convert(rawUrl: string): Promise<ConversionResult> {
    const url = validateUrl(rawUrl);
    const fetchedAt = new Date().toISOString();

    const response = await axios.get<string>(url.href, {
      timeout: this.options.timeoutMs,
      headers: {
        'User-Agent': 'url-to-markdown/1.0.0',
        Accept: 'text/html,application/xhtml+xml',
        ...this.options.headers,
      },
      responseType: 'text',
    });

    const contentType: string = response.headers['content-type'] ?? '';
    if (!contentType.startsWith('text/html') && !contentType.startsWith('application/xhtml')) {
      throw new Error(
        `Expected HTML content but received "${contentType}" from ${url.href}`,
      );
    }

    const $ = cheerio.load(response.data);
    const title = this.extractTitle($);
    const contentHtml = this.extractContent($);

    const td = this.setupTurndown();
    let markdown = td.turndown(contentHtml);

    // Collapse more than two consecutive blank lines
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

    const parts: string[] = [];

    if (this.options.includeMetadata) {
      parts.push(buildMetadataBlock(title, url.href, fetchedAt));
    }

    if (this.options.includeTitle) {
      parts.push(`# ${title}\n`);
    }

    parts.push(markdown);

    return {
      markdown: parts.join('\n'),
      title,
      url: url.href,
      fetchedAt,
    };
  }
}

/**
 * Convenience function: converts a URL to Markdown in a single call.
 *
 * @param url - The URL to convert.
 * @param options - Optional conversion settings.
 * @returns A {@link ConversionResult} containing the Markdown and metadata.
 */
export async function convertUrlToMarkdown(
  url: string,
  options: ConversionOptions = {},
): Promise<ConversionResult> {
  return new UrlToMarkdownConverter(options).convert(url);
}
