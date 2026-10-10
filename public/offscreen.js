/**
 * Offscreen Document Dispatcher for Offline Farsi TTS
 * 
 * Transport & Audio Playback Layer for Chrome Extension Manifest V3.
 * Delegates 100% of linguistic and synthesis processing to the canonical
 * TTS engine bundle (tts-engine.bundle.js).
 * Contains ZERO duplicated TTS algorithms or phonemization tables.
 */

(function () {
  'use strict';

  console.log('⚡ Farsi Offline TTS Offscreen Document Initialized');

  const audioEl = document.getElementById('tts-audio-player');
  let currentAudioUrl = null;
  let isCurrentlySpeaking = false;
  let currentLifecycleState = 'IDLE';
  let currentPlaybackId = 0;
  let activeEngineType = 'espeak';

  // Load saved engine preference from storage
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['farsiTtsEngine'], (res) => {
      if (res?.farsiTtsEngine === 'piper' || res?.farsiTtsEngine === 'espeak') {
        activeEngineType = res.farsiTtsEngine;
        if (window.farsiOfflineTts) {
          window.farsiOfflineTts.setEngine(activeEngineType);
        }
      }
    });
  }

  function getManager() {
    return window.farsiOfflineTts || null;
  }

  function broadcastStatus(state, playbackId, error, durationMs, engineUsed) {
    currentLifecycleState = state;
    isCurrentlySpeaking = (state === 'STARTED' || state === 'PLAYING');
    const payload = {
      target: 'TTS_CLIENT',
      action: 'STATUS_CHANGED',
      type: 'STATUS_CHANGED',
      state,
      playbackId: playbackId ?? currentPlaybackId,
      error,
      durationMs,
      engineUsed: engineUsed || activeEngineType
    };
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(payload, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    } catch {}
  }

  function stopAllAudio(broadcast = true) {
    isCurrentlySpeaking = false;
    currentLifecycleState = 'STOPPED';
    const manager = getManager();
    if (manager) {
      manager.stop();
    }

    if (audioEl) {
      audioEl.onended = null;
      audioEl.onerror = null;
      audioEl.onplay = null;
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.src = '';
      } catch {}
    }

    if (currentAudioUrl) {
      try {
        URL.revokeObjectURL(currentAudioUrl);
      } catch {}
      currentAudioUrl = null;
    }

    if (broadcast) {
      broadcastStatus('STOPPED', currentPlaybackId);
    }
  }

  // Central Chrome Extension Message Dispatcher
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = message.action || message.type;
    if (message.target !== 'OFFSCREEN_TTS' && !['SPEAK', 'STOP', 'SET_ENGINE', 'GET_STATUS', 'GET_TTS_STATUS'].includes(action)) {
      return false;
    }

    switch (action) {
      case 'SPEAK': {
        const text = message.text || '';
        const engine = message.engine || activeEngineType;
        const speed = message.speed ?? 1.0;
        const pitch = message.pitch ?? 1.0;
        const volume = message.volume ?? 1.0;
        const allowFallback = message.allowFallback ?? true;
        const playbackId = message.playbackId || ++currentPlaybackId;
        currentPlaybackId = playbackId;

        // Reset any prior audio without extra STOPPED broadcast
        stopAllAudio(false);
        broadcastStatus('STARTED', playbackId, undefined, undefined, engine);

        const manager = getManager();
        if (!manager) {
          isCurrentlySpeaking = false;
          broadcastStatus('ERROR', playbackId, 'TTS manager bundle not yet initialized', undefined, engine);
          sendResponse({ success: false, error: 'TTS manager bundle not yet initialized' });
          return false;
        }

        manager.synthesize(text, { engine, speed, pitch, volume, allowFallback, playbackId })
          .then(async (res) => {
            // Guard against stale playback if a stop or new utterance occurred while synthesizing
            if (currentPlaybackId !== playbackId) {
              return;
            }

            if (!res.success || !res.wavBlob) {
              isCurrentlySpeaking = false;
              const errMsg = res.error || 'Synthesis returned no audio';
              broadcastStatus('ERROR', playbackId, errMsg, 0, res.engineUsed);
              sendResponse({
                success: false,
                engineUsed: res.engineUsed,
                error: errMsg
              });
              return;
            }

            // Play through dedicated HTML5 Audio element
            currentAudioUrl = URL.createObjectURL(res.wavBlob);
            if (audioEl) {
              audioEl.src = currentAudioUrl;
              audioEl.volume = Math.max(0, Math.min(1, volume));

              audioEl.onplay = () => {
                if (currentPlaybackId === playbackId) {
                  broadcastStatus('PLAYING', playbackId, undefined, res.durationMs, res.engineUsed);
                }
              };

              audioEl.onended = () => {
                if (currentPlaybackId === playbackId) {
                  broadcastStatus('ENDED', playbackId, undefined, res.durationMs, res.engineUsed);
                  stopAllAudio(false);
                }
              };

              audioEl.onerror = () => {
                if (currentPlaybackId === playbackId) {
                  broadcastStatus('ERROR', playbackId, 'Audio element playback error', res.durationMs, res.engineUsed);
                  stopAllAudio(false);
                }
              };

              await audioEl.play().catch((playErr) => {
                console.warn('Offscreen HTML5 play error, audio element might require interaction:', playErr);
                if (currentPlaybackId === playbackId) {
                  broadcastStatus('ERROR', playbackId, playErr?.message || 'Audio playback failed', res.durationMs, res.engineUsed);
                }
              });
            }

            sendResponse({
              success: true,
              engineUsed: res.engineUsed,
              durationMs: res.durationMs,
              fallbackTriggered: res.fallbackTriggered ?? false,
              fallbackReason: res.fallbackReason
            });
          })
          .catch((err) => {
            console.error('Synthesis failed in offscreen document:', err);
            isCurrentlySpeaking = false;
            broadcastStatus('ERROR', playbackId, err?.message || 'Synthesis failed', 0, engine);
            sendResponse({ success: false, error: err?.message || 'Synthesis failed' });
          });

        return true; // Keep response channel open for asynchronous sendResponse
      }

      case 'STOP': {
        stopAllAudio(true);
        sendResponse({ success: true });
        return false;
      }

      case 'SET_ENGINE': {
        if (message.engine === 'piper' || message.engine === 'espeak') {
          activeEngineType = message.engine;
          const manager = getManager();
          if (manager) {
            manager.setEngine(activeEngineType);
          }
          if (chrome.storage?.local) {
            chrome.storage.local.set({ farsiTtsEngine: activeEngineType });
          }
        }
        sendResponse({ success: true, activeEngine: activeEngineType });
        return false;
      }

      case 'GET_STATUS':
      case 'GET_TTS_STATUS': {
        sendResponse({
          success: true,
          status: {
            isSpeaking: isCurrentlySpeaking,
            state: currentLifecycleState,
            activeEngine: activeEngineType,
            offscreenReady: true,
          }
        });
        return false;
      }

      default:
        return false;
    }
  });
})();
