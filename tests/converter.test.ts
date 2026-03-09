import nock from 'nock';
import { UrlToMarkdownConverter, convertUrlToMarkdown } from '../src/converter';

const SIMPLE_HTML = `<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <h1>Welcome</h1>
  <p>This is a <a href="https://link.com">link</a> and some text.</p>
  <img src="image.png" alt="A photo" />
</body>
</html>`;

const ARTICLE_HTML = `<!DOCTYPE html>
<html>
<head><title>Article Page</title></head>
<body>
  <nav>Nav content</nav>
  <article>
    <h2>Article Heading</h2>
    <p>Article body text.</p>
  </article>
  <footer>Footer content</footer>
</body>
</html>`;

beforeEach(() => {
  nock.cleanAll();
});

afterEach(() => {
  nock.cleanAll();
});

describe('UrlToMarkdownConverter', () => {
  describe('convert()', () => {
    it('converts a simple page to markdown with title and metadata', async () => {
      nock('https://example.com')
        .get('/')
        .reply(200, SIMPLE_HTML, { 'content-type': 'text/html; charset=utf-8' });

      const converter = new UrlToMarkdownConverter();
      const result = await converter.convert('https://example.com/');

      expect(result.title).toBe('Test Page');
      expect(result.url).toBe('https://example.com/');
      expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.markdown).toContain('# Test Page');
      expect(result.markdown).toContain('---');
      expect(result.markdown).toContain('url: https://example.com/');
    });

    it('omits H1 title when includeTitle is false', async () => {
      nock('https://example.com')
        .get('/')
        .reply(200, SIMPLE_HTML, { 'content-type': 'text/html' });

      const converter = new UrlToMarkdownConverter({ includeTitle: false });
      const result = await converter.convert('https://example.com/');

      expect(result.markdown).not.toContain('# Test Page');
    });

    it('omits front-matter when includeMetadata is false', async () => {
      nock('https://example.com')
        .get('/')
        .reply(200, SIMPLE_HTML, { 'content-type': 'text/html' });

      const converter = new UrlToMarkdownConverter({ includeMetadata: false });
      const result = await converter.convert('https://example.com/');

      expect(result.markdown).not.toContain('---');
      expect(result.markdown).not.toContain('fetched_at:');
    });

    it('strips images when includeImages is false', async () => {
      nock('https://example.com')
        .get('/')
        .reply(200, SIMPLE_HTML, { 'content-type': 'text/html' });

      const converter = new UrlToMarkdownConverter({ includeImages: false });
      const result = await converter.convert('https://example.com/');

      expect(result.markdown).not.toContain('image.png');
      expect(result.markdown).not.toContain('![');
    });

    it('strips link hrefs when includeLinks is false', async () => {
      nock('https://example.com')
        .get('/')
        .reply(200, SIMPLE_HTML, { 'content-type': 'text/html' });

      const converter = new UrlToMarkdownConverter({ includeLinks: false });
      const result = await converter.convert('https://example.com/');

      expect(result.markdown).not.toContain('https://link.com');
      expect(result.markdown).toContain('link');
    });

    it('extracts content using contentSelector', async () => {
      nock('https://example.com')
        .get('/')
        .reply(200, ARTICLE_HTML, { 'content-type': 'text/html' });

      const converter = new UrlToMarkdownConverter({ contentSelector: 'article' });
      const result = await converter.convert('https://example.com/');

      expect(result.markdown).toContain('Article Heading');
      expect(result.markdown).not.toContain('Nav content');
      expect(result.markdown).not.toContain('Footer content');
    });

    it('throws when contentSelector matches no elements', async () => {
      nock('https://example.com')
        .get('/')
        .reply(200, SIMPLE_HTML, { 'content-type': 'text/html' });

      const converter = new UrlToMarkdownConverter({ contentSelector: '#nonexistent' });
      await expect(converter.convert('https://example.com/')).rejects.toThrow(
        'Content selector "#nonexistent" matched no elements',
      );
    });

    it('throws for non-HTML content type', async () => {
      nock('https://example.com')
        .get('/data.json')
        .reply(200, '{"key": "value"}', { 'content-type': 'application/json' });

      const converter = new UrlToMarkdownConverter();
      await expect(converter.convert('https://example.com/data.json')).rejects.toThrow(
        'Expected HTML content',
      );
    });

    it('throws for an invalid URL', async () => {
      const converter = new UrlToMarkdownConverter();
      await expect(converter.convert('not-a-url')).rejects.toThrow('Invalid URL');
    });

    it('throws for a non-http URL', async () => {
      const converter = new UrlToMarkdownConverter();
      await expect(converter.convert('ftp://example.com')).rejects.toThrow('Unsupported protocol');
    });

    it('handles HTTP 404 errors', async () => {
      nock('https://example.com')
        .get('/missing')
        .reply(404, 'Not Found', { 'content-type': 'text/html' });

      const converter = new UrlToMarkdownConverter();
      await expect(converter.convert('https://example.com/missing')).rejects.toThrow();
    });

    it('removes boilerplate (nav, footer) from the output', async () => {
      nock('https://example.com')
        .get('/')
        .reply(200, ARTICLE_HTML, { 'content-type': 'text/html' });

      const converter = new UrlToMarkdownConverter();
      const result = await converter.convert('https://example.com/');

      expect(result.markdown).not.toContain('Nav content');
      expect(result.markdown).not.toContain('Footer content');
    });
  });
});

describe('convertUrlToMarkdown', () => {
  it('is a convenience function that delegates to UrlToMarkdownConverter', async () => {
    nock('https://example.com')
      .get('/')
      .reply(200, SIMPLE_HTML, { 'content-type': 'text/html' });

    const result = await convertUrlToMarkdown('https://example.com/', {
      includeMetadata: false,
      includeTitle: true,
    });

    expect(result.title).toBe('Test Page');
    expect(result.markdown).toContain('# Test Page');
    expect(result.markdown).not.toContain('---');
  });
});
