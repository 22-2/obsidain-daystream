import react from "@vitejs/plugin-react";
import { builtinModules } from "module";
import path from "path";
import { defineConfig, loadEnv, type UserConfig } from "vite";
import analyzer from "vite-bundle-analyzer";
import inspect from "vite-plugin-inspect";
import { obsidianCopyVite } from "@22-2/obsidian-copy-bundler-plugin";

export default defineConfig(async ({ mode }) => {
  const { resolve } = path;
  const env = loadEnv(mode, process.cwd(), "");

  const isAnalyze = process.argv.includes("--analyze");
  const isWatch = process.argv.includes("--watch");
  const isDev = mode === "development" || isWatch;
  const isProd = !isDev;
  const onMyPc = env.ON_MY_PC === "true";

  return {
    devtools: isAnalyze,
    plugins: [
      isAnalyze && inspect({open: true, outputDir: "inspect"}),
      isAnalyze && analyzer(),
      react(),
      // reactCompilerPreset(),
      // Copy built files into user's local Obsidian plugins when developing on PC
      onMyPc && obsidianCopyVite({
        // pluginsDir: [
        //   // "C:/Users/17890/AppData/Roaming/obsidian/Obsidian Sandbox/.obsidian/plugins",
        //   "E:/AppData/obsidian/vaults/suizen/.obsidian/plugins",
        //   // "G:/マイドライブ/documents/obsidian/vaults/sagyosen/.obsidian/plugins",
        // ],
        targetDir: "E:/AppData/obsidian/vaults/suizen/.obsidian/plugins/mobile-first-daily-interface",
        force: true,
      }),

      // Ensure CI/build output `dist/` contains files Obsidian expects (manifest.json, main.js)
      obsidianCopyVite({
        targetDir: path.resolve(import.meta.dirname, "dist"),
        force: true,
      }),
    ],
    resolve: {
      alias: {
        src: path.resolve(import.meta.dirname, "./src"),
        react: "preact/compat",
        "react-dom": "preact/compat",
        "react-dom/client": "preact/compat/client",
        "react-dom/test-utils": "preact/test-utils",
        "react/jsx-runtime": "preact/jsx-runtime",
      },
    },
    build: {
      lib: {
        entry: resolve(import.meta.dirname, "src/main.ts"),
        name: "main",
        fileName: () => "main.js",
        formats: ["cjs"],
      },
      minify: isProd,
      sourcemap: isProd ? false : "inline",
      // watchモード時はRollupのwatch設定を渡す
      // ここではsrc配下のファイルを監視対象にしておく（必要に応じて調整してください）
      watch: isWatch ? { include: "src/**" } : undefined,
      cssCodeSplit: false,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, "src/main.ts"),
        },
        output: {
          entryFileNames: "main.js",
          assetFileNames: "styles.css",
        },
        external: [
          "obsidian",
          "electron",
          "@codemirror/autocomplete",
          "@codemirror/collab",
          "@codemirror/commands",
          "@codemirror/language",
          "@codemirror/lint",
          "@codemirror/search",
          "@codemirror/state",
          "@codemirror/view",
          "@lezer/common",
          "@lezer/highlight",
          "@lezer/lr",
          ...builtinModules,
        ],
      },
    },
  } as UserConfig;
});
