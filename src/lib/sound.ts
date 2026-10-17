/**
 * Aviso sonoro para la pregunta de esfuerzo. Se genera con Web Audio (sin archivos de audio).
 * Los navegadores solo dejan sonar audio después de un toque del usuario, así que
 * `unlockSound()` se llama al pulsar «Empezar sesión».
 */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

export function soundSupported(): boolean {
  return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
}

/** Desbloquea el audio. Debe llamarse dentro del gesto del usuario. */
export function unlockSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  void ctx.resume();
  // Un sonido silencioso de 1 ms termina de desbloquear el audio en iOS.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.001);
}

/** Dos tonos ascendentes, cortos y claros, para «¿cómo de duro lo notas?». */
export function playPromptChime(): void {
  const ctx = getContext();
  if (!ctx) return;
  void ctx.resume();
  const start = ctx.currentTime + 0.02;
  [
    { freq: 880, at: 0 },
    { freq: 1320, at: 0.22 },
  ].forEach(({ freq, at }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = start + at;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}
