/* eslint-disable react-refresh/only-export-components --
   A provider and its consumer hook belong in one module; the cost is that this
   file re-mounts rather than hot-reloading when it changes. */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AUTH_EXPIRED } from '@/api/axios';
import { authService as defaultAuthService } from '@/api/services';

const AuthContext = createContext(null);

/**
 * DIP: the provider depends on an injected `authService` shape, not on axios.
 * Tests (and Storybook) can pass a fake with the same four methods.
 */
export function AuthProvider({ children, authService = defaultAuthService }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!authService.tokens.access) {
        if (!cancelled) setBooting(false);
        return;
      }
      try {
        const profile = await authService.profile();
        if (!cancelled) setUser(profile);
      } catch {
        authService.tokens.clear();
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authService]);

  // The axios interceptor announces an unrecoverable 401 rather than doing a
  // hard window.location redirect, which would discard all React state.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED, onExpired);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const { access, refresh } = await authService.login(credentials);
      authService.tokens.set({ access, refresh });
      const profile = await authService.profile();
      setUser(profile);
      return profile;
    },
    [authService],
  );

  /** Register then sign in, so the user lands in the app rather than back at a form. */
  const register = useCallback(
    async ({ username, password, ...rest }) => {
      await authService.register({ username, password, ...rest });
      return login({ username, password });
    },
    [authService, login],
  );

  const updateProfile = useCallback(
    async (payload) => {
      const profile = await authService.updateProfile(payload);
      setUser(profile);
      return profile;
    },
    [authService],
  );

  const logout = useCallback(() => {
    authService.tokens.clear();
    setUser(null);
  }, [authService]);

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
