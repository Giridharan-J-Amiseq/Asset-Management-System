const USER_KEY = "ws_user";
const TOKEN_KEY = "ws_token";

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(payload) {
  localStorage.setItem(TOKEN_KEY, payload.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function hasRole(roles) {
  const user = getStoredUser();
  return Boolean(user && roles.includes(user.role));
}

export function getHomePath() {
  const user = getStoredUser();
  return user?.role === "Viewer" ? "/assets" : "/dashboard";
}

export function canAccess(pathname) {
  const user = getStoredUser();
  if (!user) return false;

  const accessMap = {
    "/dashboard": ["Admin", "IT Manager"],
    "/assets": ["Admin", "IT Manager", "Viewer"],
    "/assets/new": ["Admin", "IT Manager"],
    "/assets/:id": ["Admin", "IT Manager", "Viewer"],
    "/transactions": ["Admin", "IT Manager"],
    "/assign": ["Admin", "IT Manager"],
    "/transfer": ["Admin", "IT Manager"],
    "/maintenance": ["Admin", "IT Manager"],
    "/users": ["Admin"],
    "/qr-print": ["Admin", "IT Manager"],
  };

  const match = Object.entries(accessMap).find(([pattern]) => {
    if (pattern.includes(":id")) {
      return pathname.startsWith("/assets/") && pathname !== "/assets/new";
    }
    return pattern === pathname;
  });

  return match ? match[1].includes(user.role) : true;
}