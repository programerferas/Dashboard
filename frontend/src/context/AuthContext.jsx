// Who is signed in.
//
// The session itself is an httpOnly cookie the browser holds, so there is no
// token in JavaScript and nothing to keep in localStorage. On load we ask the API
// "who am I?" and keep the answer here.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // "Checking" covers the first moment after load, before we know whether there
  // is a session — the router waits for this instead of flashing the login page.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    authApi
      .me()
      .then((response) => {
        if (active) setUser(response.user);
      })
      .catch(() => {
        // A 401 here is the normal "not signed in" case, not an error to show.
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Sign out locally even if the request failed, so the UI never pretends the
      // person is still signed in.
      setUser(null);
    }
  }, []);

  const updateAccount = useCallback(async (data) => {
    const response = await authApi.updateMe(data);
    setUser(response.user);
    return response.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      checking,
      login,
      logout,
      updateAccount,
      isAdmin: user?.role === "ADMIN",
    }),
    [user, checking, login, logout, updateAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
};
