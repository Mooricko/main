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

  // Mark this context as the offscreen document to prevent remote message recursion
  if (typeof window !== 'undefined') {
    window.__IS_OFFSCREEN_DOCUMENT__ = true;
  }

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
    isCurrentlySpeaking = (state === 'STARTED' || state === 'SYNTHESIZING' || state === 'PLAYING');
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

  /**
   * Stops local audio playback resources and resets state without
   * broadcasting any extension-level messages or triggering recursive STOP calls.
   */
  function stopLocalAudioResources() {
    isCurrentlySpeaking = false;
    currentLifecycleState = 'IDLE';

    const manager = getManager();
    if (manager) {
      if (typeof manager.stopLocal === 'function') {
        manager.stopLocal();
      } else if (typeof manager.stop === 'function') {
        manager.stop();
      }
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
  }

  /**
   * Handles an incoming STOP command:
   * Tears down local audio and broadcasts a single STOPPED event.
   * Never sends another STOP message back to background.
   */
  function handleStopCommand(playbackId) {
    stopLocalAudioResources();
    currentLifecycleState = 'STOPPED';
    broadcastStatus('STOPPED', playbackId ?? currentPlaybackId);
  }

  // Central Chrome Extension Message Dispatcher
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only act on messages the background service worker explicitly routed to us. This avoids
    // double-handling: the page's untargeted SPEAK/STOP/... broadcast reaches every extension
    // context, including this offscreen document.
    if (message.target !== 'OFFSCREEN_TTS') {
      return false;
    }

    const action = message.action || message.type;

    switch (action) {
      case 'SPEAK': {
        // Apply user's custom (BYO) endpoint config, if this is a custom-engine utterance.
        const ctts = window.customTtsEngine;
        if (ctts && typeof ctts.setConfigOverride === 'function') {
          ctts.setConfigOverride(message.customConfig || null);
        }
        const text = message.text || '';
        const engine = message.engine || activeEngineType;
        const speed = message.speed ?? 1.0;
        const pitch = message.pitch ?? 1.0;
        const volume = message.volume ?? 1.0;
        const allowFallback = message.allowFallback ?? true;
        const playbackId = message.playbackId || ++currentPlaybackId;
        currentPlaybackId = playbackId;

        // 1. Locally cancel previous audio without remote STOP messages
        stopLocalAudioResources();

        // 2. Broadcast initial state
        currentLifecycleState = 'SYNTHESIZING';
        broadcastStatus('SYNTHESIZING', playbackId, undefined, undefined, engine);

        const manager = getManager();
        if (!manager) {
          isCurrentlySpeaking = false;
          currentLifecycleState = 'ERROR';
          const errMsg = 'TTS manager bundle not yet initialized';
          broadcastStatus('ERROR', playbackId, errMsg, undefined, engine);
          sendResponse({ success: false, playbackStarted: false, error: errMsg, playbackId });
          return false;
        }

        manager.synthesize(text, { engine, speed, pitch, volume, allowFallback, playbackId })
          .then(async (res) => {
            // Guard against stale playback if a stop or newer utterance occurred while synthesizing
            if (currentPlaybackId !== playbackId) {
              return;
            }

            if (!res.success || !res.wavBlob) {
              isCurrentlySpeaking = false;
              currentLifecycleState = 'ERROR';
              const errMsg = res.error || 'Synthesis returned no audio';
              broadcastStatus('ERROR', playbackId, errMsg, 0, res.engineUsed);
              sendResponse({
                success: false,
                playbackStarted: false,
                engineUsed: res.engineUsed,
                error: errMsg,
                playbackId
              });
              return;
            }

            // Create Audio URL and prepare HTML5 Audio element
            currentAudioUrl = URL.createObjectURL(res.wavBlob);
            if (!audioEl) {
              isCurrentlySpeaking = false;
              currentLifecycleState = 'ERROR';
              const errMsg = 'Audio element not found in offscreen document';
              broadcastStatus('ERROR', playbackId, errMsg, res.durationMs, res.engineUsed);
              sendResponse({
                success: false,
                playbackStarted: false,
                error: errMsg,
                playbackId
              });
              return;
            }

            audioEl.src = currentAudioUrl;
            audioEl.volume = Math.max(0, Math.min(1, volume));

            let hasTerminalTransitionFired = false;

            audioEl.onplay = () => {
              if (currentPlaybackId === playbackId && !hasTerminalTransitionFired) {
                currentLifecycleState = 'PLAYING';
                isCurrentlySpeaking = true;
                broadcastStatus('PLAYING', playbackId, undefined, res.durationMs, res.engineUsed);
              }
            };

            audioEl.onended = () => {
              if (currentPlaybackId === playbackId && !hasTerminalTransitionFired) {
                hasTerminalTransitionFired = true;
                currentLifecycleState = 'IDLE';
                isCurrentlySpeaking = false;
                broadcastStatus('ENDED', playbackId, undefined, res.durationMs, res.engineUsed);
                stopLocalAudioResources();
              }
            };

            audioEl.onerror = () => {
              if (currentPlaybackId === playbackId && !hasTerminalTransitionFired) {
                hasTerminalTransitionFired = true;
                currentLifecycleState = 'ERROR';
                isCurrentlySpeaking = false;
                const errDetail = audioEl.error
                  ? `Code ${audioEl.error.code}: ${audioEl.error.message || 'playback error'}`
                  : 'Audio element playback error';
                broadcastStatus('ERROR', playbackId, errDetail, res.durationMs, res.engineUsed);
                stopLocalAudioResources();
              }
            };

            // Attempt to trigger playback; guard against cancellation
            if (currentPlaybackId !== playbackId) {
              stopLocalAudioResources();
              return;
            }

            try {
              await audioEl.play();
              sendResponse({
                success: true,
                playbackStarted: true,
                engineUsed: res.engineUsed,
                durationMs: res.durationMs,
                playbackId,
                fallbackTriggered: res.fallbackTriggered ?? false,
                fallbackReason: res.fallbackReason
              });
            } catch (playErr) {
              hasTerminalTransitionFired = true;
              console.warn('Offscreen HTML5 play error:', playErr);
              isCurrentlySpeaking = false;
              currentLifecycleState = 'ERROR';
              const errMessage = playErr?.name === 'NotAllowedError'
                ? 'Audio autoplay restricted by browser policy'
                : (playErr?.message || 'Audio playback failed to start');

              if (currentPlaybackId === playbackId) {
                broadcastStatus('ERROR', playbackId, errMessage, res.durationMs, res.engineUsed);
              }
              stopLocalAudioResources();

              // Explicitly return failure, never false success
              sendResponse({
                success: false,
                playbackStarted: false,
                error: errMessage,
                playbackId,
                engineUsed: res.engineUsed
              });
            }
          })
          .catch((err) => {
            console.error('Synthesis failed in offscreen document:', err);
            isCurrentlySpeaking = false;
            currentLifecycleState = 'ERROR';
            const errMsg = err?.message || 'Synthesis failed';
            if (currentPlaybackId === playbackId) {
              broadcastStatus('ERROR', playbackId, errMsg, 0, engine);
            }
            sendResponse({
              success: false,
              playbackStarted: false,
              error: errMsg,
              playbackId
            });
          });

        return true; // Keep response channel open for asynchronous sendResponse
      }

      case 'STOP': {
        handleStopCommand(message.playbackId);
        sendResponse({ success: true, playbackId: message.playbackId ?? currentPlaybackId });
        return false;
      }

      case 'SET_ENGINE': {
        if (message.engine === 'piper' || message.engine === 'espeak' || message.engine === 'custom') {
          activeEngineType = message.engine;
          const manager = getManager();
          if (manager) {
            manager.setEngine(activeEngineType);
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

      case 'PRECACHE_PIPER': {
        const manager = getManager();
        if (!manager || typeof manager.downloadPiperModel !== 'function') {
          sendResponse({ success: false, error: 'TTS manager not ready' });
          return false;
        }
        manager.downloadPiperModel()
          .then((ok) => sendResponse({ success: ok, error: ok ? undefined : 'Piper model download failed' }))
          .catch((err) => sendResponse({ success: false, error: err?.message || 'Piper model download failed' }));
        return true; // async
      }

      default:
        return false;
    }
  });
})();
