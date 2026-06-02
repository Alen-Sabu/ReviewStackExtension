const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// ── Copy static files (media folder) to dist ──────────────────────────────
function copyMediaToDist() {
  const srcDir = path.join(__dirname, 'media');
  const destDir = path.join(__dirname, 'dist', 'media');

  if (!fs.existsSync(srcDir)) return;

  // create dist/media if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // copy every file in media/
  for (const file of fs.readdirSync(srcDir)) {
    fs.copyFileSync(
      path.join(srcDir, file),
      path.join(destDir, file)
    );
    console.log(`[media] copied ${file} → dist/media/${file}`);
  }
}

const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });

      // copy media on every build so watch mode keeps it in sync too
      copyMediaToDist();

      console.log('[watch] build finished');
    });
  },
};

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [
      esbuildProblemMatcherPlugin,
    ],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});