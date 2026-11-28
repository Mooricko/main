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
  let webAudioCtx = null;
  let activeWebAudioSource = null;
  let activeWebAudioGain = null;
  let isCurrentlySpeaking = false;
  let currentLifecycleState = 'IDLE';
  let currentPlaybackId = 0;
  let activeEngineType = 'espeak';

  function isValidEngine(engine) {
    if (typeof window.isFarsiTtsEngine === 'function') {
      return window.isFarsiTtsEngine(engine);
    }
    return engine === 'piper' || engine === 'espeak' || engine === 'tiny-ava' || engine === 'custom';
  }

  // Load saved engine and voice preference from storage
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['farsiTtsEngine', 'tinyAvaVoice'], (res) => {
      if (isValidEngine(res?.farsiTtsEngine)) {
        activeEngineType = res.farsiTtsEngine;
        if (window.farsiOfflineTts) {
          window.farsiOfflineTts.setEngine(activeEngineType);
        }
      }
      if (res?.tinyAvaVoice && window.farsiOfflineTts && typeof window.farsiOfflineTts.setTinyAvaVoice === 'function') {
        window.farsiOfflineTts.setTinyAvaVoice(res.tinyAvaVoice);
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

    if (activeWebAudioSource) {
      activeWebAudioSource.onended = null;
      try { activeWebAudioSource.stop(); } catch {}
      try { activeWebAudioSource.disconnect(); } catch {}
      try { activeWebAudioSource.buffer = null; } catch {}
      activeWebAudioSource = null;
    }
    if (activeWebAudioGain) {
      try { activeWebAudioGain.disconnect(); } catch {}
      activeWebAudioGain = null;
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
   * Plays a single 24 kHz mono Float32Array PCM utterance through Web Audio API
   * in the offscreen document with clean cancellation & reference release.
   */
  async function playFloat32SentenceWebAudio(samples, sampleRate, volume, playbackId) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      throw new Error('Web Audio API unavailable in offscreen document');
    }
    if (!webAudioCtx || webAudioCtx.state === 'closed') {
      webAudioCtx = new AudioCtx({ sampleRate: sampleRate || 24000 });
    }
    if (webAudioCtx.state === 'suspended') {
      await webAudioCtx.resume();
    }
    if (currentPlaybackId !== playbackId) {
      return;
    }

    const buffer = webAudioCtx.createBuffer(1, samples.length, sampleRate || 24000);
    if (typeof buffer.copyToChannel === 'function') {
      buffer.copyToChannel(samples, 0);
    } else {
      buffer.getChannelData(0).set(samples);
    }

    await new Promise((resolve) => {
      if (currentPlaybackId !== playbackId) {
        resolve();
        return;
      }

      const source = webAudioCtx.createBufferSource();
      source.buffer = buffer;

      const gain = webAudioCtx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));

      source.connect(gain);
      gain.connect(webAudioCtx.destination);

      activeWebAudioSource = source;
      activeWebAudioGain = gain;

      source.onended = () => {
        source.onended = null;
        try { source.disconnect(); } catch {}
        try { source.buffer = null; } catch {}
        try { gain.disconnect(); } catch {}
        if (activeWebAudioSource === source) activeWebAudioSource = null;
        if (activeWebAudioGain === gain) activeWebAudioGain = null;
        resolve();
      };

      source.start(0);
    });
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
        const voice = message.voice;
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

        // Fast utterance-level streaming path for tiny-ava via 24 kHz Web Audio API
        const tinyAva = window.tinyAvaEngine;
        const canStreamTinyAva =
          engine === 'tiny-ava' &&
          tinyAva &&
          typeof tinyAva.synthesizeUtterances === 'function' &&
          Boolean(window.AudioContext || window.webkitAudioContext);

        if (canStreamTinyAva) {
          (async () => {
            let responded = false;
            let totalDurationMs = 0;
            let streamedAny = false;
            try {
              for await (const chunk of tinyAva.synthesizeUtterances(text, {
                voice,
                speed,
                pitch,
                volume,
                playbackId,
              })) {
                if (currentPlaybackId !== playbackId) {
                  return;
                }
                streamedAny = true;
                totalDurationMs += chunk.durationMs;

                if (!responded) {
                  responded = true;
                  currentLifecycleState = 'PLAYING';
                  isCurrentlySpeaking = true;
                  broadcastStatus('PLAYING', playbackId, undefined, chunk.durationMs, 'tiny-ava');
                  sendResponse({
                    success: true,
                    playbackStarted: true,
                    engineUsed: 'tiny-ava',
                    durationMs: chunk.durationMs,
                    playbackId,
                    fallbackTriggered: false,
                  });
                }

                await playFloat32SentenceWebAudio(chunk.pcm, chunk.sampleRate || 24000, volume, playbackId);

                if (currentPlaybackId !== playbackId) {
                  return;
                }
              }

              if (currentPlaybackId !== playbackId) {
                return;
              }

              if (streamedAny) {
                currentLifecycleState = 'IDLE';
                isCurrentlySpeaking = false;
                broadcastStatus('ENDED', playbackId, undefined, totalDurationMs, 'tiny-ava');
                return;
              }

              // tiny-ava produced no audio (e.g. failed init/download) -> fall through to manager fallback
              throw new Error('tiny-ava unavailable');
            } catch (streamErr) {
              if (currentPlaybackId !== playbackId) return;
              if (responded) {
                currentLifecycleState = 'ERROR';
                isCurrentlySpeaking = false;
                broadcastStatus('ERROR', playbackId, streamErr?.message || 'tiny-ava playback error', totalDurationMs, 'tiny-ava');
                return;
              }
              // Fall back cleanly to manager.synthesize (which handles eSpeak fallback if allowFallback=true)
              if (!allowFallback) {
                currentLifecycleState = 'ERROR';
                isCurrentlySpeaking = false;
                const errMsg = streamErr?.message || 'tiny-ava synthesis failed';
                broadcastStatus('ERROR', playbackId, errMsg, 0, 'tiny-ava');
                sendResponse({ success: false, playbackStarted: false, engineUsed: 'tiny-ava', error: errMsg, playbackId });
                return;
              }
              manager.synthesize(text, { engine: 'espeak', speed, pitch, volume, allowFallback: false, playbackId })
                .then(async (res) => {
                  if (currentPlaybackId !== playbackId) return;
                  if (!res.success || !res.wavBlob || !audioEl) {
                    const errMsg = res.error || 'Fallback synthesis failed';
                    broadcastStatus('ERROR', playbackId, errMsg, 0, 'espeak');
                    sendResponse({ success: false, playbackStarted: false, engineUsed: 'espeak', error: errMsg, playbackId });
                    return;
                  }
                  currentAudioUrl = URL.createObjectURL(res.wavBlob);
                  audioEl.src = currentAudioUrl;
                  audioEl.volume = Math.max(0, Math.min(1, volume));
                  audioEl.onplay = () => {
                    if (currentPlaybackId === playbackId) {
                      broadcastStatus('PLAYING', playbackId, undefined, res.durationMs, 'espeak');
                    }
                  };
                  audioEl.onended = () => {
                    if (currentPlaybackId === playbackId) {
                      broadcastStatus('ENDED', playbackId, undefined, res.durationMs, 'espeak');
                      stopLocalAudioResources();
                    }
                  };
                  await audioEl.play();
                  sendResponse({
                    success: true,
                    playbackStarted: true,
                    engineUsed: 'espeak',
                    durationMs: res.durationMs,
                    playbackId,
                    fallbackTriggered: true,
                    fallbackReason: streamErr?.message || 'tiny-ava fallback to eSpeak NG',
                  });
                })
                .catch((fbErr) => {
                  if (currentPlaybackId === playbackId) {
                    broadcastStatus('ERROR', playbackId, fbErr?.message || 'Fallback failed', 0, 'espeak');
                  }
                  sendResponse({ success: false, playbackStarted: false, error: fbErr?.message || 'Fallback failed', playbackId });
                });
            }
          })();
          return true;
        }

        manager.synthesize(text, { engine, voice, speed, pitch, volume, allowFallback, playbackId })
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
        if (isValidEngine(message.engine)) {
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

      case 'PRECACHE_TINY_AVA': {
        const manager = getManager();
        if (!manager || typeof manager.downloadTinyAvaModel !== 'function') {
          sendResponse({ success: false, error: 'TTS manager not ready' });
          return false;
        }
        manager.downloadTinyAvaModel()
          .then((ok) => sendResponse({ success: ok, error: ok ? undefined : 'tiny-ava model download failed' }))
          .catch((err) => sendResponse({ success: false, error: err?.message || 'tiny-ava model download failed' }));
        return true; // async
      }

      case 'CLEAR_TINY_AVA_CACHE': {
        const manager = getManager();
        if (!manager || typeof manager.clearTinyAvaCache !== 'function') {
          sendResponse({ success: false, error: 'TTS manager not ready' });
          return false;
        }
        manager.clearTinyAvaCache()
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: err?.message || 'Failed to clear tiny-ava cache' }));
        return true; // async
      }

      default:
        return false;
    }
  });
})();
