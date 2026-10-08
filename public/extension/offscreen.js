/**
 * Offscreen Document Dispatcher for Offline Farsi TTS
 * (Piper ONNX & eSpeak NG WASM)
 * 
 * Runs in the hidden Manifest V3 offscreen window with full AudioContext
 * and WebAssembly execution capabilities.
 */

(function () {
  'use strict';

  console.log('⚡ Farsi Offline TTS Offscreen Document Initialized');

  const espeakEngine = new window.EspeakEngine();
  const piperEngine = new window.PiperEngine();

  let activeEngineType = 'espeak';
  let isCurrentlySpeaking = false;
  let activeAudioElement = document.getElementById('tts-audio-player');
  let currentAudioUrl = null;

  // Load saved engine preference
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['farsiTtsEngine'], (res) => {
      if (res?.farsiTtsEngine === 'piper' || res?.farsiTtsEngine === 'espeak') {
        activeEngineType = res.farsiTtsEngine;
      }
    });
  }

  function stopAllAudio() {
    isCurrentlySpeaking = false;
    espeakEngine.stop();
    piperEngine.stop();

    if (activeAudioElement) {
      try {
        activeAudioElement.pause();
        activeAudioElement.currentTime = 0;
      } catch {}
    }

    if (currentAudioUrl) {
      try {
        URL.revokeObjectURL(currentAudioUrl);
      } catch {}
      currentAudioUrl = null;
    }
  }

  // Central message dispatcher
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only process messages targeted to offscreen or relevant TTS actions
    if (message.target !== 'OFFSCREEN_TTS' && !['SPEAK', 'STOP', 'SET_ENGINE', 'GET_TTS_STATUS'].includes(message.action)) {
      return false;
    }

    switch (message.action) {
      case 'SPEAK': {
        const text = message.text || '';
        const engine = message.engine || activeEngineType;
        const speed = message.speed || 1.0;
        const pitch = message.pitch || 1.0;
        const volume = message.volume !== undefined ? message.volume : 1.0;

        // 1. Immediately cancel active audio
        stopAllAudio();
        isCurrentlySpeaking = true;

        const targetEngine = engine === 'piper' ? piperEngine : espeakEngine;

        targetEngine
          .synthesize(text, { speed, pitch, volume })
          .then(async (result) => {
            // Play through HTML5 Audio element or Web Audio
            if (result.wavBlob) {
              currentAudioUrl = URL.createObjectURL(result.wavBlob);
              if (activeAudioElement) {
                activeAudioElement.src = currentAudioUrl;
                activeAudioElement.volume = Math.max(0, Math.min(1, volume));
                activeAudioElement.onended = () => {
                  isCurrentlySpeaking = false;
                  stopAllAudio();
                };
                activeAudioElement.onerror = () => {
                  isCurrentlySpeaking = false;
                  stopAllAudio();
                };
                await activeAudioElement.play().catch((err) => {
                  console.debug('Autoplay policy caught, using engine internal player:', err);
                  targetEngine.speak(text, { speed, pitch, volume });
                });
              }
            }

            sendResponse({
              success: true,
              engineUsed: result.engineUsed,
              durationMs: result.durationMs,
              fallbackTriggered: result.fallbackTriggered,
              fallbackReason: result.fallbackReason
            });
          })
          .catch((err) => {
            console.error('Synthesis error in offscreen document:', err);
            isCurrentlySpeaking = false;
            // Fallback to eSpeak NG WASM on unexpected failure
            espeakEngine
              .synthesize(text, { speed, pitch, volume })
              .then((fallbackResult) => {
                sendResponse({
                  success: true,
                  engineUsed: 'espeak',
                  durationMs: fallbackResult.durationMs,
                  fallbackTriggered: true,
                  fallbackReason: err?.message
                });
              })
              .catch((finalErr) => {
                sendResponse({ success: false, error: finalErr?.message });
              });
          });

        return true; // Keep message channel open for async response
      }

      case 'STOP': {
        stopAllAudio();
        sendResponse({ success: true });
        return false;
      }

      case 'SET_ENGINE': {
        if (message.engine === 'piper' || message.engine === 'espeak') {
          activeEngineType = message.engine;
          if (chrome.storage?.local) {
            chrome.storage.local.set({ farsiTtsEngine: activeEngineType });
          }
        }
        sendResponse({ success: true, activeEngine: activeEngineType });
        return false;
      }

      case 'GET_TTS_STATUS': {
        sendResponse({
          success: true,
          status: {
            isSpeaking: isCurrentlySpeaking,
            activeEngine: activeEngineType,
            espeakReady: true,
            offscreenReady: true
          }
        });
        return false;
      }

      default:
        return false;
    }
  });
})();
