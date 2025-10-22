// src/utils/api.ts
export type Position = { x: number; y: number };
export type Player = { id: number; username: string; skinId?: string; position?: Position; isInfiltrator?: boolean; isAlive?: boolean };
export type Npc = { id: number; skinId?: string; position?: Position; active?: boolean; movementSpeed?: number; infiltrator?: boolean };
export type Match = { id?: number; code: string; players: Player[]; npcs?: Npc[]; status?: string; timerSeconds?: number; infiltrator?: Player | null };

const API_BASE = "http://localhost:8080";

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

export async function login(payload: { username: string; password: string }): Promise<Player> {
  const r = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(r);
}

export async function createMatch(hostName: string): Promise<{ code: string }> {
  const r = await fetch(`${API_BASE}/api/match/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostName }),
  });
  return handleResponse(r);
}

export async function joinMatch(code: string, username: string): Promise<Match> {
  const r = await fetch(`${API_BASE}/api/match/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, username }),
  });
  return handleResponse(r);
}

export async function getMatch(code: string): Promise<Match> {
  const r = await fetch(`${API_BASE}/api/match/${encodeURIComponent(code)}`);
  return handleResponse(r);
}

export async function startMatch(code: string, hostName: string): Promise<Match> {
  const url = `${API_BASE}/api/match/start/${encodeURIComponent(code)}?hostName=${encodeURIComponent(hostName)}`;
  const r = await fetch(url, { method: "POST" });
  return handleResponse(r);
}