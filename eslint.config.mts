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
	{
		files: ['e2e/**/*.ts'],
		rules: {
			// E2E helpers execute in Node; this mobile compatibility rule applies to plugin code.
			'obsidianmd/no-nodejs-modules': 'off',
			// evaluateApp がコールバックを直列化するため、E2Eでは非推奨の window.app を直接使う。
			'@typescript-eslint/no-deprecated': 'off',
		},
	},
	{
		files: ['src/features/workspace/register-views-and-commands.ts'],
		rules: {
			// 意図: これらのコマンドIDは既存ホットキーに保存されているため変更しない。
			'obsidianmd/commands/no-plugin-id-in-command-id': 'off',
		},
	},
	{
		files: ['vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			'obsidianmd/no-nodejs-modules': 'off',
		},
	},
);
