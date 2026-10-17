import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

// obsidianmd/obsidian-sample-plugin の eslint.config.mts をもとに、
// 無視対象と tsconfig 外の設定ファイルだけをこのリポジトリに合わせている。
export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'playwright-report',
		'test-results',
		// .gitignore 済みの手元専用ディレクトリ
		'myfiles',
		'obsidian-e2e-toolkit-assets',
		'.releaserc.mjs',
		'version-bump.mts',
		'postcss.config.js',
		'versions.json',
		'main.js',
		'package.json',
		'pnpm-lock.yaml',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					// 意図: tsconfig の include 外にあるルートの設定ファイルも型情報付きで検査する。
					allowDefaultProject: [
						'eslint.config.mts',
						'manifest.json',
						'vite.config.ts',
						'vitest.config.ts',
						'vitest.setup.ts',
						'playwright.config.ts',
					],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
);
