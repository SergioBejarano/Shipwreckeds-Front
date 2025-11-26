// src/utils/api.ts
export type Position = { x: number; y: number };
export type Player = { id: number; username: string; skinId?: string; position?: Position; isInfiltrator?: boolean; isAlive?: boolean };
export type Npc = { id: number; skinId?: string; position?: Position; active?: boolean; movementSpeed?: number; infiltrator?: boolean };
export type Match = { id?: number; code: string; players: Player[]; npcs?: Npc[]; status?: string; timerSeconds?: number; infiltrator?: Player | null };
export type CognitoTokens = { accessToken: string; idToken?: string; refreshToken?: string; expiresIn?: number; tokenType?: string };
export type LoginResponse = { player: Player; tokens: CognitoTokens };

const env = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;

export const API_BASE = "http://alb-shipwreckeds-973139340.us-east-1.elb.amazonaws.com";
//export const API_BASE = "https://shipwreckeds-bhc3cad8bkh7bzgy.eastus-01.azurewebsites.net";

export const WS_BASE = API_BASE;
export const WS_ENDPOINT = `${WS_BASE}/ws`;

const COGNITO_DOMAIN = "https://us-east-2v0zsthd2k.auth.us-east-2.amazoncognito.com";
const COGNITO_CLIENT_ID = "4eobvf3hdfs4kk6edon0f6nmne";
const COGNITO_SCOPE = "email openid phone";
const ENV_REDIRECT = env?.VITE_COGNITO_REDIRECT_URI;
const DEFAULT_REDIRECT_URI = ENV_REDIRECT || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

const TOKEN_STORAGE_KEY = "shipwreckeds:cognitoTokens";
let cachedTokens: CognitoTokens | null = (() => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CognitoTokens) : null;
  } catch {
    return null;
  }
})();

function persistTokens(tokens: CognitoTokens | null) {
  cachedTokens = tokens;
  if (typeof window === "undefined") return;
  try {
    if (tokens) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* ignore storage failures */
  }
}

function authHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (cachedTokens?.accessToken) {
    const prefix = cachedTokens.tokenType ?? "Bearer";
    headers.set("Authorization", `${prefix} ${cachedTokens.accessToken}`);
  }
  return headers;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text || res.statusText || "Error en la petición";
    try { const json = JSON.parse(text); if (json && json.message) message = json.message; } catch {}
    throw new Error(message);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return null;
}

export async function login(payload: { username: string; password: string }): Promise<LoginResponse> {
  const r = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await handleResponse(r)) as LoginResponse;
  persistTokens(data.tokens);
  return data;
}

export async function createMatch(hostName: string): Promise<{ code: string }> {
  const r = await fetch(`${API_BASE}/api/match/create`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ hostName }),
  });
  return handleResponse(r);
}

export async function joinMatch(code: string, username: string): Promise<Match> {
  const r = await fetch(`${API_BASE}/api/match/join`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ code, username }),
  });
  return handleResponse(r);
}

export async function getMatch(code: string): Promise<Match> {
  const r = await fetch(`${API_BASE}/api/match/${encodeURIComponent(code)}`, {
    headers: authHeaders(),
  });
  return handleResponse(r);
}

export async function startMatch(code: string, hostName: string): Promise<Match> {
  const url = `${API_BASE}/api/match/start/${encodeURIComponent(code)}?hostName=${encodeURIComponent(hostName)}`;
  const r = await fetch(url, { method: "POST", headers: authHeaders() });
  return handleResponse(r);
}

export async function logout(username: string): Promise<void> {
  const r = await fetch(`${API_BASE}/api/auth/logout/${encodeURIComponent(username)}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!r.ok && r.status !== 404) {
    const text = await r.text().catch(() => "");
    throw new Error(text || "No fue posible cerrar sesión");
  }
  persistTokens(null);
}

export function getSessionTokens(): CognitoTokens | null {
  return cachedTokens;
}

export function clearSessionTokens() {
  persistTokens(null);
}

export function getRedirectUri() {
  return DEFAULT_REDIRECT_URI;
}

export function buildCognitoLoginUrl(redirectUri = getRedirectUri()) {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: "code",
    scope: COGNITO_SCOPE,
    redirect_uri: redirectUri,
  });
  return `${COGNITO_DOMAIN}/login?${params.toString()}`;
}

export async function loginWithCode(code: string, redirectUri = getRedirectUri()): Promise<LoginResponse> {
  const r = await fetch(`${API_BASE}/api/auth/login/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri }),
  });
  const data = (await handleResponse(r)) as LoginResponse;
  persistTokens(data.tokens);
  return data;
}