const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function bundleTts() {
  console.log('⚡ Bundling canonical TTS engine into tts-engine.bundle.js...');
  const rootDir = path.resolve(__dirname, '..');
  const entry = path.join(rootDir, 'src/services/tts/offscreenBridge.ts');
  const outFile = path.join(rootDir, 'public/tts-engine.bundle.js');

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    outfile: outFile,
    format: 'iife',
    globalName: 'AdhdReaderTts',
    platform: 'browser',
    target: 'es2020',
    external: ['node:*', 'module', 'fs', 'path', 'onnxruntime-web'],
    sourcemap: false,
    minify: false,
  });

  const extDir = path.join(rootDir, 'public/extension');
  if (fs.existsSync(extDir)) {
    fs.copyFileSync(outFile, path.join(extDir, 'tts-engine.bundle.js'));
  }

  console.log(`✓ Generated canonical TTS engine bundle (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
  bundleTts().catch((err) => {
    console.error('Failed to bundle TTS:', err);
    process.exit(1);
  });
}

module.exports = { bundleTts };
