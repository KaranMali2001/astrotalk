export type AuthRole = "user" | "professional"

const TOKEN_KEY = "auth_token"
const ROLE_KEY = "auth_role"

export function setAuth(token: string, role: AuthRole) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(ROLE_KEY, role)
  } catch {}
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getRole(): AuthRole | null {
  try {
    return (localStorage.getItem(ROLE_KEY) as AuthRole) || null
  } catch {
    return null
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
  } catch {}
}
