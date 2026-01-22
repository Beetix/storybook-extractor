import asyncPool from 'tiny-async-pool';
import puppeteer from 'puppeteer';
import { PUPPETEER_SETTINGS } from '../consts';
import type { Options, StorybookFormatedData } from '../types';
import sharp from 'sharp';

const MAX_DIMENSION = 2000;

const MAX_TRIM_DIMENSION = 10000;

const tryToTrimImageWhitespace = async (imageBuffer: Buffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    // Skip trimming for large images to avoid sharp "window too large" errors
    if ((metadata.width && metadata.width > MAX_TRIM_DIMENSION) ||
        (metadata.height && metadata.height > MAX_TRIM_DIMENSION)) {
      return imageBuffer;
    }

    const trimmedImage = await sharp(imageBuffer).trim({ threshold: 1 }).toBuffer();
    return trimmedImage;
  } catch (error) {
    console.error(error);
  }

  return imageBuffer;
};

/**
 * Extracts screenshots from storybook stories.
 * It selects first DOM element under #storybook-root (Storybook 7+) or #root (older) and takes a screenshot of it.
 */
export const extractScreenshots = async (data, options: Options) => {
  const browser = await puppeteer.launch(PUPPETEER_SETTINGS);
  const withScreenshot: (StorybookFormatedData | undefined)[] = [];
  for await (const result of asyncPool(
    options.concurentScrapers,
    data,
    async ({ urls, id, ...rest }: StorybookFormatedData) => {
      try {
        const page = await browser.newPage();

        await page.goto(urls.storyUrlIframe, {
          waitUntil: 'networkidle0',
        });

        // Wait for story content to render - Storybook 7+ uses #storybook-root, older versions use #root
        // Stories render asynchronously so we need to wait for children to appear
        const selector = await page
          .waitForFunction(
            () => {
              if (document.querySelector('#storybook-root > *')) {
                return '#storybook-root > *';
              }
              if (document.querySelector('#root > *')) {
                return '#root > *';
              }
              return null;
            },
            { timeout: 30000 },
          )
          .then((handle) => handle.jsonValue())
          .catch(() => null);

        if (!selector) {
          // Fallback: take full-page screenshot for modals/portals that render outside root
          console.warn(id, 'No story root element found, using full-page screenshot');
          const picBuffer = await page.screenshot({ type: 'png', fullPage: true });
          const image = await tryToTrimImageWhitespace(Buffer.from(picBuffer));
          await page.close();
          return {
            id,
            ...rest,
            urls,
            pictureBase64: `data:image/png;base64,${image.toString('base64')}`,
          };
        }

        const coordinates = await page.$eval(selector, (el) => {
          const rect = (<HTMLElement>el)?.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        });

        const picBuffer = await page.screenshot({
          type: 'png',
          omitBackground: true,
          clip: {
            x: coordinates.x,
            y: coordinates.y,
            width: Math.min(coordinates.width || 100, MAX_DIMENSION),
            height: Math.min(coordinates.height || 100, MAX_DIMENSION),
          },
        });

        const image = await tryToTrimImageWhitespace(Buffer.from(picBuffer));

        await page.close();

        return {
          id,
          ...rest,
          urls,
          pictureBase64: `data:image/png;base64,${image.toString('base64')}`,
        };
      } catch (error) {
        console.error(id, error);
      }
    },
  )) {
    withScreenshot.push(result);
  }
  await browser.close();

  return withScreenshot;
};
