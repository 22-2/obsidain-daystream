import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // 意図: workerを使い回してjsdomの準備負荷を抑えつつ、VM単位でテストごとの分離を保つ。
    pool: 'vmForks',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}', 'packages/*/src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'e2e/**'],
    alias: {
      "src": path.resolve(__dirname, './src'),
      'obsidian': path.resolve(__dirname, './src/__mocks__/obsidian.ts'),
    },
    server: {
      deps: {
        // 意図: @22-2/obsidian-magical-editor は内部で obsidian をインポートするが、
        // デフォルトでは node_modules 内にエイリアスが適用されない。
        // inline に指定することで Vite 経由でバンドルされ、obsidian エイリアスが有効になる。
        inline: ['@22-2/obsidian-magical-editor'],
      },
    },
  },
});
