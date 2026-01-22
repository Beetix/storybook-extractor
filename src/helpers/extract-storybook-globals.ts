import puppeteer from 'puppeteer';
import { PUPPETEER_SETTINGS } from '../consts';

export const extractStorybookGlobals = async (url: string) => {
  const browser = await puppeteer.launch(PUPPETEER_SETTINGS);
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

  // Wait for Storybook store to be available
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return window.__STORYBOOK_STORY_STORE__ !== undefined;
    },
    { timeout: 30000 },
  );

  const data = JSON.parse(
    await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const store = window.__STORYBOOK_STORY_STORE__;

      // Storybook 7+ requires cacheAllCSFFiles() before extract()
      if (typeof store.cacheAllCSFFiles === 'function') {
        await store.cacheAllCSFFiles();
      }

      return JSON.stringify(store.extract(), null, 2);
    }),
  );

  setImmediate(() => {
    browser.close();
  });

  return data;
};
