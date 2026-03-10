import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://34.9.225.66',
  },
  reporter: 'list',
});
