/** Local wp-env address used by Playwright scripts and tests. */
module.exports = {
  siteUrl: 'http://localhost:9788',
  screenshotDefaults: {
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 375, height: 812 },
  },
};
