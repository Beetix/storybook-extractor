import asyncPool from 'tiny-async-pool';
import puppeteer from 'puppeteer';
import { PUPPETEER_SETTINGS } from '../consts';
import type { Options, StorybookFormatedData } from '../types';

/**
 * Extracts HTML from /docs/ pages from storybook.
 */
export const extractDocs = async (data, options: Options) => {
  const browser = await puppeteer.launch(PUPPETEER_SETTINGS);

  const withDocs: (StorybookFormatedData | undefined)[] = [];
  for await (const result of asyncPool(
    options.concurentScrapers,
    data,
    async ({ urls, ...rest }: StorybookFormatedData) => {
      try {
        const page = await browser.newPage();

        await page.goto(urls.docsUrlIframe, {
          waitUntil: 'domcontentloaded',
        });

        // Wait for content to load - try multiple selectors for different Storybook versions
        // Storybook 7+ uses .sb-docs-content or .docs-story, older versions use #docs-root
        await page.waitForFunction(
          () => {
            return (
              document.querySelector('#docs-root') ||
              document.querySelector('.sb-docs-content') ||
              document.querySelector('.docs-story') ||
              document.querySelector('h1')
            );
          },
          { timeout: 5000 },
        );

        const docsData = await page.evaluate(() => {
          // Try different root selectors for compatibility
          const root =
            document.querySelector('#docs-root') ||
            document.querySelector('.sb-docs-content') ||
            document.body;

          return {
            heading: root.querySelector('h1')?.innerText,
            firstParagraph: root.querySelector('p')?.innerText,
            tablesHtml: [...root.querySelectorAll('table')].map(
              (el) => el?.outerHTML,
            ),
            codeSnippets: [...root.querySelectorAll('pre code')].map(
              (el) => (<HTMLElement>el)?.innerText,
            ),
            fullText: (<HTMLElement>root)?.innerText,
            rawHtml: (<HTMLElement>root)?.innerHTML,
          };
        });

        await page.close();

        return { ...rest, urls, docs: docsData };
      } catch (error) {
        console.error(rest.id, error);
      }
    },
  )) {
    withDocs.push(result);
  }

  await browser.close();

  return withDocs;
};
