export const ADMIN_SESSION_COOKIE = "admin_session";

export function getAdminConfig() {
  const user = process.env.ADMIN_DASHBOARD_USER ?? "";
  const pass = process.env.ADMIN_DASHBOARD_PASS ?? "";
  const sessionToken = process.env.ADMIN_SESSION_TOKEN ?? "";
  return { user, pass, sessionToken };
}

export function isAdminConfigValid() {
  const { user, pass, sessionToken } = getAdminConfig();
  return Boolean(user && pass && sessionToken);
}

export function isValidAdminCredentials(user: string, pass: string) {
  const config = getAdminConfig();
  return user === config.user && pass === config.pass;
}

export function isValidSessionToken(token: string) {
  const config = getAdminConfig();
  return token !== "" && token === config.sessionToken;
}
