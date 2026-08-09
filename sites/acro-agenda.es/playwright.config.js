const { defineConfig, devices } = require('@playwright/test');
const { siteUrl } = require('./screenshot.config.cjs');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: process.env.PAGE_URL || siteUrl,
    ...devices['Desktop Chrome'],
  },
});
