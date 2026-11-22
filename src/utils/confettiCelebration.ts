import confetti from 'canvas-confetti';

/**
 * Checks if the user has requested reduced motion.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fires a celebratory multi-stage confetti animation when a user
 * finishes a predefined focus reading session block or achieves a milestone.
 *
 * @param highlightHex The reader's theme highlight color to personalize the celebration.
 */
export function triggerFocusBlockConfetti(highlightHex?: string) {
  if (prefersReducedMotion()) return;

  const primaryColor = highlightHex || '#ef4444';
  const celebrationColors = [
    primaryColor,
    '#f59e0b', // Gold / Amber
    '#10b981', // Emerald
    '#3b82f6', // Sapphire Blue
    '#a855f7', // Violet
    '#ec4899', // Pink
  ];

  // Stage 1: Dynamic Center Fountain Cannon
  confetti({
    particleCount: 75,
    spread: 80,
    origin: { y: 0.65, x: 0.5 },
    colors: celebrationColors,
    startVelocity: 45,
    ticks: 240,
    gravity: 0.9,
    scalar: 1.1,
  });

  // Stage 2: Left and Right Cross-fire cannons (200ms delay)
  setTimeout(() => {
    if (prefersReducedMotion()) return;

    // Left cannon
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 65,
      origin: { x: 0.05, y: 0.75 },
      colors: celebrationColors,
      startVelocity: 40,
      ticks: 200,
    });

    // Right cannon
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 65,
      origin: { x: 0.95, y: 0.75 },
      colors: celebrationColors,
      startVelocity: 40,
      ticks: 200,
    });
  }, 220);

  // Stage 3: Gentle star and circle flutter rain (450ms delay)
  setTimeout(() => {
    if (prefersReducedMotion()) return;

    confetti({
      particleCount: 35,
      spread: 120,
      origin: { y: 0.35, x: 0.5 },
      colors: ['#ffd700', primaryColor, '#ffffff', '#38bdf8'],
      shapes: ['star', 'circle'],
      scalar: 1.25,
      gravity: 0.7,
      ticks: 280,
    });
  }, 450);
}

/**
 * Fires a mini celebration burst for smaller achievements (e.g. quick milestone preview).
 */
export function triggerMiniConfetti(highlightHex?: string) {
  if (prefersReducedMotion()) return;

  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.7, x: 0.5 },
    colors: [highlightHex || '#ef4444', '#ffd700', '#10b981'],
    startVelocity: 30,
    ticks: 160,
  });
}
