import { createHash } from 'node:crypto';

export const transformStorybookData = (rawData: unknown, url: string) => {
  // Ensure URL ends with slash for proper path concatenation
  const baseUrl = url.endsWith('/') ? url : `${url}/`;

  return Object.keys(rawData).map((key) => {
    const entry = rawData[key];
    // Storybook 7+ uses 'title' and 'name', older versions use 'kind', 'name', 'story'
    const id = entry.id;
    const kind = entry.kind || entry.title;
    const storyName = entry.name || entry.story;

    const kindSplit = kind.split('/');
    const componentName = kindSplit[kindSplit.length - 1];

    const hash = createHash('md5').update(id).digest('hex');

    return {
      id: hash,
      title: `${componentName}/${storyName}`,
      storyPath: kind,
      storyName: storyName,
      storyId: id,
      componentName,
      urls: {
        storyUrl: `${baseUrl}?path=/story/${id}`,
        storyUrlIframe: `${baseUrl}iframe.html?id=${id}&args=&viewMode=story`,
        docsUrl: `${baseUrl}?path=/docs/${id}`,
        docsUrlIframe: `${baseUrl}iframe.html?id=${id}&viewMode=docs`,
      },
      raw: entry,
    };
  });
};
