import path from 'path';
import fsextra from 'fs-extra';
import { extractDocs } from './helpers/extract-docs';
import type { Options } from './types';
import { extractScreenshots } from './helpers/extract-screenshot';
import { extractStorybookGlobals } from './helpers/extract-storybook-globals';
import { transformStorybookData } from './helpers/transform-storybook-data';

export async function extract(options: Options) {
  // Ensure URL ends with slash before appending iframe.html
  const baseUrl = options.url.endsWith('/') ? options.url : `${options.url}/`;
  const iframeUrl = `${baseUrl}iframe.html`;
  const data = await extractStorybookGlobals(iframeUrl);
  const transformedData = transformStorybookData(data, options.url);

  // TODO: This could run concurrently
  if (transformedData.length > 0) {
    console.log(
      `Found ${transformedData.length} docs pages, extracting documentation...`,
    );
    const withDocs = await extractDocs(transformedData, options);
    console.log(
      `Found ${transformedData.length} stories, extracting screenshots...`,
    );
    const fullData = await extractScreenshots(withDocs, options);

    // Filter out undefined results from failed extractions
    const validData = fullData.filter(
      (item): item is NonNullable<typeof item> => item !== undefined,
    );

    console.log(
      `Successfully extracted ${validData.length} of ${transformedData.length} stories`,
    );

    await fsextra.writeFile(options.output, JSON.stringify(validData, null, 2));

    if (options.postProcess.length > 0) {
      for (const postProcess of options.postProcess) {
        const pathToScript = path.resolve(process.cwd(), postProcess);
        await import(pathToScript).then((postProcess) => {
          if (typeof postProcess === 'function') {
            postProcess(fullData);
          } else if (typeof postProcess?.default === 'function') {
            postProcess.default(fullData);
          }
        });
      }
    }
  }
}
