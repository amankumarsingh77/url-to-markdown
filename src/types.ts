/**
 * Options for the URL-to-Markdown conversion.
 */
export interface ConversionOptions {
  /** Include the page title as an H1 heading at the top */
  includeTitle?: boolean;
  /** Include metadata block (URL, date fetched) at the top */
  includeMetadata?: boolean;
  /** Include image alt-text and src links */
  includeImages?: boolean;
  /** Include hyperlinks (href) in the output */
  includeLinks?: boolean;
  /** CSS selector for the main content element to extract (e.g. "article", "main") */
  contentSelector?: string;
  /** HTTP request timeout in milliseconds */
  timeoutMs?: number;
  /** Custom HTTP headers to send with the fetch request */
  headers?: Record<string, string>;
}

/**
 * The result of a successful URL-to-Markdown conversion.
 */
export interface ConversionResult {
  /** The converted Markdown string */
  markdown: string;
  /** The page title extracted from <title> or the first <h1> */
  title: string;
  /** The canonical URL that was fetched */
  url: string;
  /** ISO 8601 timestamp of when the page was fetched */
  fetchedAt: string;
}
