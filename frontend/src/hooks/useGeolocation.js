import { useCallback, useEffect, useState } from 'react';

/**
 * Geolocation with an explicit outcome, because "no coordinates" has three very
 * different causes and the lots page has to say which one happened:
 *
 *   idle | locating | ready | denied | unavailable
 *
 * The old page treated every failure as "still loading" and sat blank forever.
 */
export function useGeolocation({ auto = true } = {}) {
  const [state, setState] = useState({ status: 'idle', coords: null, message: null });

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({
        status: 'unavailable',
        coords: null,
        message: 'This browser cannot share your location.',
      });
      return;
    }

    setState((s) => ({ ...s, status: 'locating', message: null }));

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setState({ status: 'ready', coords: { lat: coords.latitude, lng: coords.longitude }, message: null }),
      (err) =>
        setState({
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
          coords: null,
          message:
            err.code === err.PERMISSION_DENIED
              ? 'Location access is blocked, so lots are not sorted by distance.'
              : 'Could not read your location, so lots are not sorted by distance.',
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    // Asking the browser for a position is a call out to a platform API; the
    // state lands in its callback, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (auto) locate();
  }, [auto, locate]);

  return { ...state, locate };
}
