export const PUPPETEER_SETTINGS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  protocolTimeout: 60000, // 60 second timeout for CDP commands
};
