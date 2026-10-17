import { useEffect } from 'react';

/**
 * Mantiene la pantalla encendida mientras `active` sea true (Screen Wake Lock API).
 * El navegador suelta el bloqueo al cambiar de app, así que se vuelve a pedir
 * cuando la página vuelve a estar visible.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await lock.release();
        } else {
          sentinel = lock;
        }
      } catch {
        // Denegado (batería baja, pestaña oculta…): la sesión sigue igual.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
    };
  }, [active]);
}
