import type { StorybookConfig } from '@storybook/nextjs-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  "stories": [
    "../storybook/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public"
  ],
  async viteFinal(config) {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
        '@/widgets': path.resolve(__dirname, '../src/widgets'),
        '@/features': path.resolve(__dirname, '../src/features'),
        '@/entities': path.resolve(__dirname, '../src/entities'),
        '@/shared': path.resolve(__dirname, '../src/shared'),
      };
    }
    // Suppress warnings for 'use client' directives (expected in Storybook builds)
    if (config.build) {
      config.build.chunkSizeWarningLimit = 2000; // Increase limit to 2MB (suppress chunk size warnings)
      config.build.rollupOptions = {
        ...config.build.rollupOptions,
        onwarn(warning, warn) {
          // Suppress 'use client' directive warnings
          if (warning.message.includes("Module level directives cause errors when bundled")) {
            return;
          }
          // Suppress sourcemap warnings
          if (warning.message.includes("Error when using sourcemap")) {
            return;
          }
          // Suppress comment annotation warnings from dependencies
          if (warning.message.includes("contains an annotation that Rollup cannot interpret")) {
            return;
          }
          warn(warning);
        },
      };
    }
    return config;
  },
};
export default config;