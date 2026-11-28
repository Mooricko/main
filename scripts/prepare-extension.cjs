const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { bundleTts } = require('./bundle-tts.cjs');

async function prepareExtension() {
  console.log('🚀 Preparing Chrome Extension files & zip bundle...');
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');
  const extDir = path.join(publicDir, 'extension');

  // Verify dist exists
  if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ directory does not exist. Run vite build first.');
    process.exit(1);
  }

  // 0. Build canonical TTS engine bundle
  await bundleTts();

  // Create target directories
  fs.mkdirSync(path.join(extDir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(extDir, 'icons'), { recursive: true });
  fs.mkdirSync(path.join(extDir, 'wasm'), { recursive: true });
  fs.mkdirSync(path.join(distDir, 'wasm'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'wasm'), { recursive: true });

  // 1. Copy assets
  const appJsSrc = path.join(distDir, 'assets', 'app.js');
  const appCssSrc = path.join(distDir, 'assets', 'index.css');

  if (fs.existsSync(appJsSrc)) {
    fs.copyFileSync(appJsSrc, path.join(extDir, 'assets', 'app.js'));
    console.log('✓ Copied assets/app.js');
  } else {
    console.warn('⚠️ Warning: app.js not found in dist/assets');
  }

  if (fs.existsSync(appCssSrc)) {
    fs.copyFileSync(appCssSrc, path.join(extDir, 'assets', 'app.css'));
    fs.copyFileSync(appCssSrc, path.join(extDir, 'assets', 'index.css'));
    console.log('✓ Copied assets/app.css');
  }

  // 2. Prepare production index.html for extension
  const extensionHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Khoroos Reader - Word-by-Word RSVP Focus Reader</title>
    <meta name="description" content="Word-by-word RSVP focus reader with middle-letter highlighting." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=JetBrains+Mono:wght@400;500;700&family=Lexend:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script type="module" crossorigin src="./assets/app.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index.css">
  </head>
  <body class="bg-[#0f1117] text-slate-100 antialiased selection:bg-red-500/30 selection:text-red-200">
    <div id="root"></div>
  </body>
</html>
`;
  fs.writeFileSync(path.join(extDir, 'index.html'), extensionHtml, 'utf8');
  fs.writeFileSync(path.join(distDir, 'index.html'), extensionHtml, 'utf8');

  // 2.5 Sync exact version-matched PDF.js worker from installed pdfjs-dist legacy build
  const pdfWorkerSrc = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');
  if (fs.existsSync(pdfWorkerSrc)) {
    fs.copyFileSync(pdfWorkerSrc, path.join(publicDir, 'pdf.worker.min.mjs'));
    console.log('✓ Synced pdf.worker.min.mjs from pdfjs-dist legacy build');
  } else {
    console.warn('⚠️ Warning: pdf.worker.min.mjs not found in node_modules/pdfjs-dist/legacy/build');
  }

  // 2.6 Sync version-matched ONNX Runtime Web JS + WASM/MJS binaries into wasm/
  const ortDistDir = path.join(rootDir, 'node_modules', 'onnxruntime-web', 'dist');
  const ortWasmJsSrc = path.join(ortDistDir, 'ort.wasm.min.js');
  if (fs.existsSync(ortWasmJsSrc)) {
    fs.copyFileSync(ortWasmJsSrc, path.join(publicDir, 'ort.min.js'));
    console.log('✓ Synced ort.min.js from onnxruntime-web/dist/ort.wasm.min.js');
  }

  const ortWasmBinaries = [
    'ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.mjs',
  ];

  for (const binFile of ortWasmBinaries) {
    const src = path.join(ortDistDir, binFile);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(publicDir, 'wasm', binFile));
      fs.copyFileSync(src, path.join(extDir, 'wasm', binFile));
      fs.copyFileSync(src, path.join(distDir, 'wasm', binFile));
      // Keep root copies synced for backward compatibility with legacy paths
      fs.copyFileSync(src, path.join(publicDir, binFile));
      console.log('✓ Synced wasm/' + binFile + ' from onnxruntime-web/dist');
    } else {
      console.warn('⚠️ Warning: ' + binFile + ' not found in node_modules/onnxruntime-web/dist');
    }
  }

  // 3. Copy manifest, background, content, icons, offscreen document & runtime assets
  const filesToCopy = [
    'manifest.json',
    'background.js',
    'content.js',
    'content.css',
    'offscreen.html',
    'offscreen.js',
    'ort.min.js',
    'ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.mjs',
    'tts-engine.bundle.js',
    'espeak-ng.wasm',
    'fa_IR-amir-medium.onnx.json',
    'tiny-ava-parisa.json',
    'tiny-ava-v2.json',
    'pdf.worker.min.mjs'
  ];

  for (const file of filesToCopy) {
    const src = path.join(publicDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(extDir, file));
      fs.copyFileSync(src, path.join(distDir, file));
      console.log('✓ Synced ' + file);
    }
  }

  // Copy espeak-data folder
  const espeakDataSrc = path.join(publicDir, 'espeak-data');
  if (fs.existsSync(espeakDataSrc)) {
    fs.cpSync(espeakDataSrc, path.join(extDir, 'espeak-data'), { recursive: true });
    fs.cpSync(espeakDataSrc, path.join(distDir, 'espeak-data'), { recursive: true });
    console.log('✓ Synced espeak-data directory');
  }

  // Copy icons
  const iconsSrcDir = path.join(publicDir, 'icons');
  if (fs.existsSync(iconsSrcDir)) {
    const icons = fs.readdirSync(iconsSrcDir);
    for (const icon of icons) {
      fs.copyFileSync(path.join(iconsSrcDir, icon), path.join(extDir, 'icons', icon));
      fs.mkdirSync(path.join(distDir, 'icons'), { recursive: true });
      fs.copyFileSync(path.join(iconsSrcDir, icon), path.join(distDir, 'icons', icon));
    }
    console.log('✓ Synced icons');
  }

  // 4. Create README.txt
  const readmeText = `Khoroos Reader - Chrome Extension (Manifest V3)
===================================================
How to install this extension in Google Chrome:

1. Open Google Chrome and navigate to: chrome://extensions
2. In the top-right corner, turn ON the "Developer mode" toggle.
3. Click the "Load unpacked" button in the top-left corner.
4. Select this extracted folder (the one containing manifest.json).
5. Done! Click the Extensions puzzle icon in Chrome toolbar and Pin Khoroos Reader.

How to read highlighted text from any webpage:
---------------------------------------------
- Method 1 (Quick Floating Bubble): Highlight any sentence, article, or paragraph
  on any website. A floating "⚡ Read in Khoroos Reader" pill will appear right above
  your selection. Click it to immediately open the RSVP Reader!
- Method 2 (Right-Click Menu): Highlight text, right click, and select
  "⚡ Read selected text with Khoroos Reader".
- Method 3 (Keyboard Shortcut): Highlight text and press Alt+R (Option+R on Mac).
- Method 4 (Toolbar Popup): Click the Khoroos Reader icon in your browser toolbar.
`;
  fs.writeFileSync(path.join(extDir, 'README.txt'), readmeText, 'utf8');

  // 5. Build ZIP bundle using JSZip
  const zip = new JSZip();
  zip.file('manifest.json', fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
  zip.file('background.js', fs.readFileSync(path.join(extDir, 'background.js'), 'utf8'));
  zip.file('content.js', fs.readFileSync(path.join(extDir, 'content.js'), 'utf8'));
  zip.file('content.css', fs.readFileSync(path.join(extDir, 'content.css'), 'utf8'));
  zip.file('offscreen.html', fs.readFileSync(path.join(extDir, 'offscreen.html'), 'utf8'));
  zip.file('offscreen.js', fs.readFileSync(path.join(extDir, 'offscreen.js'), 'utf8'));
  zip.file('tts-engine.bundle.js', fs.readFileSync(path.join(extDir, 'tts-engine.bundle.js'), 'utf8'));
  zip.file('index.html', extensionHtml);
  zip.file('README.txt', readmeText);

  if (fs.existsSync(path.join(extDir, 'ort.min.js'))) {
    zip.file('ort.min.js', fs.readFileSync(path.join(extDir, 'ort.min.js'), 'utf8'));
  }

  const wasmFolder = zip.folder('wasm');
  for (const binFile of ortWasmBinaries) {
    const binPath = path.join(extDir, 'wasm', binFile);
    if (fs.existsSync(binPath)) {
      wasmFolder.file(binFile, fs.readFileSync(binPath));
    }
  }
  if (fs.existsSync(path.join(extDir, 'espeak-ng.wasm'))) {
    zip.file('espeak-ng.wasm', fs.readFileSync(path.join(extDir, 'espeak-ng.wasm')));
  }
  if (fs.existsSync(path.join(extDir, 'fa_IR-amir-medium.onnx.json'))) {
    zip.file('fa_IR-amir-medium.onnx.json', fs.readFileSync(path.join(extDir, 'fa_IR-amir-medium.onnx.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(extDir, 'tiny-ava-parisa.json'))) {
    zip.file('tiny-ava-parisa.json', fs.readFileSync(path.join(extDir, 'tiny-ava-parisa.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(extDir, 'tiny-ava-v2.json'))) {
    zip.file('tiny-ava-v2.json', fs.readFileSync(path.join(extDir, 'tiny-ava-v2.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(extDir, 'pdf.worker.min.mjs'))) {
    zip.file('pdf.worker.min.mjs', fs.readFileSync(path.join(extDir, 'pdf.worker.min.mjs'), 'utf8'));
  }

  const assetsFolder = zip.folder('assets');
  if (fs.existsSync(path.join(extDir, 'assets', 'app.js'))) {
    assetsFolder.file('app.js', fs.readFileSync(path.join(extDir, 'assets', 'app.js'), 'utf8'));
  }
  if (fs.existsSync(path.join(extDir, 'assets', 'index.css'))) {
    assetsFolder.file('index.css', fs.readFileSync(path.join(extDir, 'assets', 'index.css'), 'utf8'));
    assetsFolder.file('app.css', fs.readFileSync(path.join(extDir, 'assets', 'index.css'), 'utf8'));
  }

  const iconsFolder = zip.folder('icons');
  if (fs.existsSync(iconsSrcDir)) {
    const icons = fs.readdirSync(iconsSrcDir);
    for (const icon of icons) {
      iconsFolder.file(icon, fs.readFileSync(path.join(iconsSrcDir, icon)));
    }
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const zipPath = path.join(publicDir, 'adhd-reader-chrome-extension-v3.zip');
  fs.writeFileSync(zipPath, zipBuffer);
  fs.writeFileSync(path.join(distDir, 'adhd-reader-chrome-extension-v3.zip'), zipBuffer);
  console.log(`🎉 Successfully packaged extension zip (${(zipBuffer.length / 1024).toFixed(1)} KB) to ${zipPath}`);
}

prepareExtension().catch((err) => {
  console.error('Error preparing extension:', err);
  process.exit(1);
});

