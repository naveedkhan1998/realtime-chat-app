/**
 * Notification Sound Utility
 *
 * Generates a pleasant notification sound using Web Audio API.
 * No external audio files needed - creates the sound programmatically.
 */

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return null;
    }
  }

  // Resume context if suspended (required by some browsers)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
};

/**
 * Plays a pleasant notification sound.
 *
 * The sound is a two-tone chime that's not too intrusive:
 * - First note: Higher pitch (880 Hz - A5)
 * - Second note: Slightly lower (659 Hz - E5)
 *
 * Duration: ~300ms total
 */
export const playNotificationSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Create a two-tone chime
  const playTone = (frequency: number, startTime: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Envelope: quick attack, natural decay
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Natural decay

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  // First note - higher
  playTone(880, now, 0.15);
  // Second note - lower, slightly delayed
  playTone(659, now + 0.1, 0.2);
};

/**
 * Preloads the audio context to avoid delay on first notification.
 * Should be called after a user interaction (e.g., login, page click).
 */
export const preloadNotificationSound = (): void => {
  getAudioContext();
};

export default playNotificationSound;
