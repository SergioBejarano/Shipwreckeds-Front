import { mergeConfig } from 'vite';
import { defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      globals: true,
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov'],
        reportsDirectory: 'coverage',
      },
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  })
);
