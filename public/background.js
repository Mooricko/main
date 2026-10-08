/**
 * ADHD Reader - Background Service Worker (Manifest V3)
 */

// Register context menus on extension install / update
chrome.runtime.onInstalled.addListener(() => {
  // Selection context menu
  chrome.contextMenus.create({
    id: 'adhd-read-selection',
    title: '⚡ Read selected text with ADHD Reader',
    contexts: ['selection']
  });

  // Entire page context menu
  chrome.contextMenus.create({
    id: 'adhd-read-page',
    title: '📖 Read webpage with ADHD Reader',
    contexts: ['page']
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'adhd-read-selection' && info.selectionText) {
    await saveCapturedTextAndOpen(
      info.selectionText,
      tab?.title || 'Selected Text',
      tab?.url || ''
    );
  } else if (info.menuItemId === 'adhd-read-page' && tab?.id) {
    // Request content script to extract text
    try {
      chrome.tabs.sendMessage(tab.id, { action: 'GET_SELECTED_TEXT' }, async (response) => {
        if (chrome.runtime.lastError) {
          console.debug('Could not query page:', chrome.runtime.lastError.message);
          return;
        }
        const textToRead = response?.selectedText || response?.articleText;
        if (textToRead) {
          await saveCapturedTextAndOpen(textToRead, response.title, response.url);
        }
      });
    } catch (err) {
      console.error('Failed to send message to tab:', err);
    }
  }
});

// Handle keyboard command (e.g. Alt+R)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'read-selection') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      chrome.tabs.sendMessage(activeTab.id, { action: 'GET_SELECTED_TEXT' }, async (response) => {
        if (chrome.runtime.lastError) return;
        const text = response?.selectedText || response?.articleText;
        if (text) {
          await saveCapturedTextAndOpen(text, response.title, response.url);
        }
      });
    }
  }
});

// ============================================================================
// OFFSCREEN DOCUMENT PIPELINE FOR OFFLINE FARSI TTS (Piper ONNX & eSpeak WASM)
// ============================================================================
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let creatingOffscreenPromise = null;

/**
 * Checks if the offscreen document is already open
 */
async function hasOffscreenDocument() {
  if ('offscreen' in chrome && typeof chrome.offscreen?.hasDocument === 'function') {
    return await chrome.offscreen.hasDocument();
  }
  // Fallback for Chromium versions where hasDocument is not available
  if ('clients' in self && typeof self.clients?.matchAll === 'function') {
    const matchedClients = await self.clients.matchAll();
    return matchedClients.some((c) => c.url.includes(OFFSCREEN_DOCUMENT_PATH));
  }
  return false;
}

/**
 * Ensures the offscreen document exists to run WASM/AudioContext
 */
async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }

  if ('offscreen' in chrome && typeof chrome.offscreen?.createDocument === 'function') {
    creatingOffscreenPromise = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Synthesize and play offline TTS audio for Farsi.'
    });

    try {
      await creatingOffscreenPromise;
      console.log('✓ Offscreen document created for Farsi TTS audio playback');
    } catch (err) {
      console.warn('Failed to create offscreen document:', err);
    } finally {
      creatingOffscreenPromise = null;
    }
  }
}

// Handle messages from content script & UI components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Text Capture from Webpage
  if (message.action === 'CAPTURE_AND_READ' && message.text) {
    saveCapturedTextAndOpen(message.text, message.title, message.url).then(() => {
      sendResponse({ success: true });
    });
    return true; // async response
  }

  // 2. Offscreen Document Internal Routing (Ignore messages targeted specifically to offscreen)
  if (message.target === 'OFFSCREEN_TTS') {
    return false;
  }

  // 3. Farsi Offline TTS Actions: SPEAK, STOP, SET_ENGINE, GET_TTS_STATUS, PRECACHE_PIPER
  if (['SPEAK', 'STOP', 'SET_ENGINE', 'GET_TTS_STATUS', 'PRECACHE_PIPER'].includes(message.action)) {
    (async () => {
      try {
        await ensureOffscreenDocument();

        // Forward to Offscreen Document with explicit target
        const offscreenPayload = {
          ...message,
          target: 'OFFSCREEN_TTS'
        };

        chrome.runtime.sendMessage(offscreenPayload, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ 
              success: false, 
              error: chrome.runtime.lastError.message 
            });
          } else {
            sendResponse(response || { success: true });
          }
        });
      } catch (err) {
        sendResponse({ success: false, error: err?.message || String(err) });
      }
    })();
    return true; // Keep message channel open for async response
  }
});

/**
 * Stores captured text in chrome.storage.local and opens/focuses the reader
 */
async function saveCapturedTextAndOpen(text, title, url) {
  const timestamp = Date.now();
  const cleanTitle = (title || 'Captured Webpage Text').slice(0, 150);

  // 1. Store in chrome.storage.local for full text persistence
  try {
    await chrome.storage.local.set({
      capturedText: text,
      capturedTitle: cleanTitle,
      capturedUrl: url || '',
      capturedTime: timestamp
    });
  } catch (err) {
    console.warn('ADHD Reader storage error:', err);
  }

  // 2. Build URL with query params for instant synchronous loading (up to 2000 chars)
  const safeTextParam = text && text.length <= 2000 
    ? `&captureText=${encodeURIComponent(text)}` 
    : '';
  const safeTitleParam = cleanTitle 
    ? `&captureTitle=${encodeURIComponent(cleanTitle)}` 
    : '';
  const safeUrlParam = url 
    ? `&captureUrl=${encodeURIComponent(url)}` 
    : '';

  const targetUrl = chrome.runtime.getURL(
    `index.html?source=web-capture${safeTitleParam}${safeUrlParam}${safeTextParam}`
  );

  // 3. Check if an ADHD Reader tab is already open
  try {
    const readerBaseUrl = chrome.runtime.getURL('index.html');
    const tabs = await chrome.tabs.query({});
    const readerTab = tabs.find(t => t.url && t.url.startsWith(readerBaseUrl));

    if (readerTab && readerTab.id) {
      // Focus existing reader tab and notify it
      await chrome.tabs.update(readerTab.id, { active: true });
      if (readerTab.windowId) {
        await chrome.windows.update(readerTab.windowId, { focused: true });
      }
      chrome.tabs.sendMessage(readerTab.id, {
        action: 'NEW_CAPTURED_TEXT',
        text,
        title: cleanTitle,
        url: url || '',
        timestamp
      }).catch(() => {});
      return;
    }
  } catch (err) {
    console.debug('Could not query tabs, opening new tab:', err);
  }

  // 4. Open a new dedicated ADHD Reader tab
  try {
    await chrome.tabs.create({
      url: targetUrl
    });
  } catch (err) {
    console.error('Failed to create ADHD Reader tab:', err);
  }
}
