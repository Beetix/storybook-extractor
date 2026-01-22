#!/usr/bin/env node
import { extract } from "./extract";
import path from "path";
import sade from "sade";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require("../package.json");

sade("storybook-extractor", true)
  .version(packageJson.version)
  .describe(packageJson.description)
  .option("-c, --config", "Path to config file")
  .action(async (options) => {
    const configPath = path.resolve(process.cwd(), options.config);
    const configModule = await import(configPath);
    const config = configModule.default || configModule;

    if (!config.concurentScrapers) {
      config.concurentScrapers = 10;
    }

    extract(config);
  })
  .parse(process.argv);
