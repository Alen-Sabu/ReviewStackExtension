const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

function copyMediaToDist() {
  const srcDir = path.join(__dirname, "media");
  const destDir = path.join(__dirname, "dist", "media");

  if (!fs.existsSync(srcDir)) return;

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const file of fs.readdirSync(srcDir)) {
    if (file === "index.html") continue;
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    console.log(`[media] copied ${file} → dist/media/${file}`);
  }
}

const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(
            `    ${location.file}:${location.line}:${location.column}:`,
          );
        }
      });

      copyMediaToDist();
      console.log("[watch] build finished");
    });
  },
};

const sharedPlugins = [esbuildProblemMatcherPlugin];

async function main() {
  const extensionCtx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "silent",
    plugins: sharedPlugins,
  });

  const webviewCtx = await esbuild.context({
    entryPoints: ["src/webview/app.ts"],
    bundle: true,
    format: "iife",
    minify: production,
    sourcemap: !production,
    platform: "browser",
    outfile: "dist/media/webview.js",
    logLevel: "silent",
    plugins: sharedPlugins,
  });

  if (watch) {
    await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
  } else {
    await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
    await extensionCtx.dispose();
    await webviewCtx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
