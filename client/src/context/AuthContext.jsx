import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/index.js';
import { setUnauthorizedHandler } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (authService.getToken() ? authService.getCachedUser() : null));
  const [ready, setReady] = useState(!authService.getToken());

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  // Any 401 from the API (expired token, deleted account) signs the user out.
  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  // Validate a stored session on first load.
  useEffect(() => {
    if (!authService.getToken()) return;
    authService
      .me()
      .then(setUser)
      .catch((err) => {
        // Keep the cached user if the server is temporarily unreachable; drop it if the token is invalid.
        if (err.status === 401) logout();
      })
      .finally(() => setReady(true));
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user),
      login: async (email, password) => setUser(await authService.login(email, password)),
      register: async (payload) => setUser(await authService.register(payload)),
      logout,
      setUser,
    }),
    [user, ready, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
