// src/components/GameCanvas.tsx
import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import type { IMessage } from "@stomp/stompjs";
import { getMatch } from "../utils/api";
import barcoSrc from "../assets/barco.png";
import "../styles/game.css";

type Avatar = {
  id: number;
  type: "human" | "npc";
  ownerUsername?: string | null;
  x: number;
  y: number;
  isInfiltrator?: boolean;
  isAlive?: boolean;
  displayName?: string | null;
};

type Island = {
  cx: number;
  cy: number;
  radius: number;
};

type GameState = {
  code: string;
  timestamp?: number;
  timerSeconds?: number;
  avatars: Avatar[];
  island: Island;
  boat?: { x: number; y: number };
};

type VoteStartPayload = { options: Avatar[]; message?: string };
type VoteResultPayload = { counts: Record<number, number>; expelledId?: number | null; expelledType?: string; message?: string };

type Props = {
  matchCode: string;
  currentUser: string;
  canvasWidth?: number; // opcional
  canvasHeight?: number; // opcional
};

const WS_URL = "http://localhost:8080/ws"; // apunta a tu backend
const BACKEND_BASE = WS_URL.replace(/\/ws$/, '');

export default function GameCanvas({ matchCode, currentUser, canvasWidth = 900, canvasHeight = 600 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcoImgRef = useRef<HTMLImageElement | null>(null);
  const clientRef = useRef<Client | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  // voting UI state
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [voteOptions, setVoteOptions] = useState<Avatar[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteResult, setVoteResult] = useState<VoteResultPayload | null>(null);

  // movement state
  const keysRef = useRef<Record<string, boolean>>({});
  const sendIntervalRef = useRef<number | null>(null);
  

  // ----- moved INSIDE the component to avoid invalid hook call -----
  const myAvatarIdRef = useRef<number | null>(null);
  // map local (por sesión) de id de NPC -> alias visible para este cliente
  const npcNameMapRef = useRef<Record<number, string>>({});
  // flag local para saber si el cliente actual es el infiltrado
  const isInfiltratorRef = useRef<boolean>(false);

  // ----------------------------------------------------------------

  // init STOMP client & subscribe to /topic/game/{matchCode}
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // shim global for sockjs-client modules that expect Node global
        try { (window as any).global = (window as any).global || window; } catch (e) {}

        const mod = await import("sockjs-client");
        const SockJS = (mod && (mod as any).default) || mod;

        if (!mounted) return;

        const socket = new SockJS(WS_URL);
        const client = new Client({
          webSocketFactory: () => socket as any,
          reconnectDelay: 2000,
          heartbeatIncoming: 0,
          heartbeatOutgoing: 20000,
          onConnect: () => {
            setConnected(true);
            client.subscribe(`/topic/game/${matchCode}`, (msg: IMessage) => {
              try {
                const payload = JSON.parse(msg.body) as GameState;
                    setGameState(payload);
                    // update local infiltrator flag: try to find our avatar by ownerUsername or known id
                    try {
                      const myByOwner = payload.avatars.find(a => a.ownerUsername === currentUser && a.type === 'human');
                      const myById = myAvatarIdRef.current != null ? payload.avatars.find(a => a.id === myAvatarIdRef.current) : undefined;
                      const myAvatar = myByOwner || myById;
                      isInfiltratorRef.current = !!(myAvatar && myAvatar.isInfiltrator);
                    } catch (e) {
                      // ignore
                    }
              } catch (e) {
                console.warn("Invalid game message", e);
              }
            });

            // voting: start and result
            client.subscribe(`/topic/game/${matchCode}/vote/start`, (msg: IMessage) => {
              try {
                const payload = JSON.parse(msg.body) as VoteStartPayload;
                setVoteOptions(payload.options || []);
                setHasVoted(false);
                // only open modal for non-infiltrators (infiltrados no participan)
                if (isInfiltratorRef.current) {
                  // ensure we do not open voting UI for infiltrator
                  return;
                }
                setVoteModalOpen(true);
              } catch (e) {
                console.warn('Invalid vote start', e);
              }
            });

            client.subscribe(`/topic/game/${matchCode}/vote/result`, (msg: IMessage) => {
              try {
                const payload = JSON.parse(msg.body) as VoteResultPayload;
                // set result state so UI can render counts and expelled info
                setVoteResult(payload);
                // close vote selection modal
                setVoteModalOpen(false);
                // if human expelled, we'll show result then redirect in UI after a short delay
              } catch (e) {
                console.warn('Invalid vote result', e);
              }
            });
          },
          onStompError: (frame: any) => {
            console.error('STOMP error', frame);
          },
          onDisconnect: () => setConnected(false),
        });

        client.activate();
        clientRef.current = client;
      } catch (e) {
        console.error('Failed to init SockJS/STOMP client', e);
      }
    };

    init();

    return () => {
      mounted = false;
      try { clientRef.current?.deactivate(); } catch {}
      clientRef.current = null;
      setConnected(false);
    };
  }, [matchCode]);

  // fetch initial match state in case we missed server broadcast
  useEffect(() => {
    let mounted = true;
    async function fetchInitial() {
      try {
        const m = await getMatch(matchCode);
        if (!mounted || !m) return;
        if (m.status === "STARTED") {
          // build GameState-like object from match
          const island = { cx: 0, cy: 0, radius: 100 };
          const avatars = [] as Avatar[];
          if (Array.isArray(m.players)) {
            for (const p of m.players) {
              const pos = p.position || { x: 0, y: 0 };
                if (p.isInfiltrator) {
                  // do not reveal infiltrator username in initial fetch; represent as npc
                  avatars.push({
                    id: p.id,
                    type: "npc",
                    ownerUsername: null,
                    x: pos.x,
                    y: pos.y,
                    isInfiltrator: true,
                    isAlive: p.isAlive,
                  });
                } else {
                  avatars.push({
                    id: p.id,
                    type: "human",
                    ownerUsername: p.username,
                    x: pos.x,
                    y: pos.y,
                    isInfiltrator: !!p.isInfiltrator,
                    isAlive: p.isAlive,
                  });
                }
              if (p.username === currentUser) {
                myAvatarIdRef.current = p.id; // <-- guarda mi id aquí
              }
            }
          }
          if (Array.isArray(m.npcs)) {
            for (const n of m.npcs) {
              const pos = n.position || { x: 0, y: 0 };
              avatars.push({
                id: n.id,
                type: "npc",
                ownerUsername: null,
                x: pos.x,
                y: pos.y,
                isInfiltrator: !!n.infiltrator,
                isAlive: n.active !== false,
              });
            }
          }
          setGameState({ code: matchCode, timestamp: Date.now(), island, avatars });
        }
      } catch (e) {
        // ignore: no initial state available
      }
    }
    fetchInitial();
    return () => { mounted = false; };
  }, [matchCode, currentUser]);

  // preload barco image
  useEffect(() => {
    const img = new Image();
    img.src = barcoSrc;
    barcoImgRef.current = img;
  }, []);

    // asigna alias aleatorios a NPCs que aún no tengan uno (por sesión)
  useEffect(() => {
    if (!gameState) return;
    const map = npcNameMapRef.current;
    for (const a of gameState.avatars) {
      if (a.type === "npc" && !map[a.id]) {
        const rand = Math.floor(Math.random() * 9000) + 1000; // 4 dígitos
        map[a.id] = `NPC-${rand}`;
      }
    }
  }, [gameState]);

    const getDisplayName = useCallback((a: Avatar) => {
      if (a.displayName) return a.displayName;
      if (a.ownerUsername) return a.ownerUsername;
      return npcNameMapRef.current[a.id] || `NPC-${a.id}`;
    }, []);


  const getMyAvatar = useCallback((): Avatar | undefined => {
    if (!gameState) return undefined;
    // preferir búsqueda por ownerUsername si existe
    const byOwner = gameState.avatars.find((a: Avatar) => a.ownerUsername === currentUser && a.type === "human");
    if (byOwner) return byOwner;
    // fallback: usar el id guardado en fetchInitial
    if (myAvatarIdRef.current != null) {
      return gameState.avatars.find((a: Avatar) => a.id === myAvatarIdRef.current) as Avatar | undefined;
    }
    return undefined;
  }, [gameState, currentUser]);

  // send move command to server
  const sendMove = useCallback((dx: number, dy: number) => {
    const client = clientRef.current;
    if (!client || client.connected === false) return;
    const myAvatar = getMyAvatar();
    if (!myAvatar || !gameState) return;

    // client-side clamp: compute a proposed small step and ensure it stays within island radius
    const island = gameState.island || { cx: 0, cy: 0, radius: 100 };
    const step = (island.radius || 100) * 0.035; // step in world units per send
    const proposedX = myAvatar.x + dx * step;
    const proposedY = myAvatar.y + dy * step;
    const distToCenter = Math.hypot(proposedX - island.cx, proposedY - island.cy);
    const margin = 1; // safety margin in world units
    let finalDx = dx;
    let finalDy = dy;

    if (distToCenter > (island.radius - margin)) {
      // clamp to nearest point on island edge inside the radius
      const vecX = proposedX - island.cx;
      const vecY = proposedY - island.cy;
      const len = Math.hypot(vecX, vecY) || 1;
      const clampedX = island.cx + (vecX / len) * (island.radius - margin);
      const clampedY = island.cy + (vecY / len) * (island.radius - margin);
      // direction from current to clamped
      const ndx = clampedX - myAvatar.x;
      const ndy = clampedY - myAvatar.y;
      const nlen = Math.hypot(ndx, ndy) || 1;
      finalDx = ndx / nlen;
      finalDy = ndy / nlen;
      // if the clamped target is effectively current, don't send
      if (Math.hypot(ndx, ndy) < 1e-3) return;
    }

    const body = {
      username: currentUser,
      avatarId: myAvatar.id,
      direction: { dx: finalDx, dy: finalDy },
    };
    try {
      client.publish({
        destination: `/app/game/${matchCode}/move`,
        body: JSON.stringify(body),
      });
    } catch (e) {
      // ignore
    }
  }, [currentUser, getMyAvatar, matchCode, gameState]);

  // keyboard handlers (WASD / arrow)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      keysRef.current[e.key.toLowerCase()] = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current[e.key.toLowerCase()] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // periodic sender while keys pressed
  useEffect(() => {
    // send at 8x per second
    const T = 1000 / 8;
    sendIntervalRef.current = window.setInterval(() => {
      // compute direction
      const k = keysRef.current;
      let dx = 0, dy = 0;
      if (k["arrowup"] || k["w"]) dy -= 1;
      if (k["arrowdown"] || k["s"]) dy += 1;
      if (k["arrowleft"] || k["a"]) dx -= 1;
      if (k["arrowright"] || k["d"]) dx += 1;
      if (dx !== 0 || dy !== 0) {
        // normalize
        const len = Math.hypot(dx, dy) || 1;
        sendMove(dx / len, dy / len);
      }
    }, T);
    return () => {
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
        sendIntervalRef.current = null;
      }
    };
  }, [sendMove]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let rafId = 0;
    const canvasEl = canvas; // narrow non-null
    const ctxEl = ctx; // narrow non-null

    function worldToPixel(x: number, y: number) {
      // map world coords (center 0,0) to canvas pixels
      // island radius in world units -> pixel radius = 0.36 * min(width,height)
      const w = canvasEl.width / (window.devicePixelRatio || 1);
      const h = canvasEl.height / (window.devicePixelRatio || 1);
      const pixelIslandRadius = Math.min(w, h) * 0.36;
      const scale = (gameState?.island?.radius && gameState.island.radius > 0)
        ? pixelIslandRadius / gameState.island.radius
        : pixelIslandRadius / 100; // fallback
      const cx = w / 2;
      const cy = h / 2;
      return {
        px: cx + x * scale,
        py: cy - y * scale, // invert y for canvas
        scale,
        islandPixelRadius: pixelIslandRadius,
        centerX: cx,
        centerY: cy
      };
    }

    function draw() {
      // clear (use actual pixel buffer size)
      ctxEl.clearRect(0, 0, canvasEl.width, canvasEl.height);

      // draw sea background
      ctxEl.fillStyle = "#9ad0ff"; // light blue
      ctxEl.fillRect(0, 0, canvasEl.width, canvasEl.height);

      // if no gameState, text
      if (!gameState) {
        ctxEl.fillStyle = "#023e8a";
        ctxEl.font = "18px Inter, sans-serif";
        ctxEl.fillText("Esperando estado del juego...", 20, 40);
        rafId = requestAnimationFrame(draw);
        return;
      }

      // island
      const island = gameState.island || { cx: 0, cy: 0, radius: 100 };
      const { islandPixelRadius, centerX, centerY } = worldToPixel(island.cx, island.cy);
      // gradient: center green, edge sand
      const grad = ctxEl.createRadialGradient(centerX, centerY, islandPixelRadius * 0.1, centerX, centerY, islandPixelRadius);
      grad.addColorStop(0, "#7BD389"); // green
      grad.addColorStop(0.7, "#E8D8A8"); // sand
      ctxEl.beginPath();
      ctxEl.fillStyle = grad;
      ctxEl.arc(centerX, centerY, islandPixelRadius, 0, Math.PI * 2);
      ctxEl.fill();
      ctxEl.closePath();

      // boat: draw image to the right of island
      const boatImg = barcoImgRef.current;
      if (boatImg && boatImg.complete) {
        const boatW = islandPixelRadius * 0.5;
        const boatH = islandPixelRadius * 0.25;
        ctxEl.drawImage(boatImg, centerX + islandPixelRadius + 6, centerY - boatH / 2, boatW, boatH);
      } else {
        // fallback rectangle
        const boatW = islandPixelRadius * 0.5;
        const boatH = islandPixelRadius * 0.25;
        ctxEl.fillStyle = "#6b3e26";
        ctxEl.fillRect(centerX + islandPixelRadius + 6, centerY - boatH / 2, boatW, boatH);
        ctxEl.strokeStyle = "#3b2b1f";
        ctxEl.strokeRect(centerX + islandPixelRadius + 6, centerY - boatH / 2, boatW, boatH);
      }

      // draw avatars
      for (const a of gameState.avatars) {
        const { px, py } = worldToPixel(a.x, a.y);
        // choose style
        let fill = a.type === "human" ? "#3b82f6" : "#ef476f"; // humans blue, npcs pink
        if (a.type === "human" && a.ownerUsername === currentUser) fill = "#06b6d4"; // own player teal
        // shadow
        ctxEl.beginPath();
        ctxEl.fillStyle = "rgba(0,0,0,0.12)";
        ctxEl.ellipse(px + 3, py + 6, 10, 5, 0, 0, Math.PI * 2);
        ctxEl.fill();
        ctxEl.closePath();

        // avatar circle
        ctxEl.beginPath();
        ctxEl.fillStyle = fill;
        ctxEl.strokeStyle = a.isInfiltrator ? "#ffcc00" : "#ffffff";
        ctxEl.lineWidth = a.isInfiltrator ? 3 : 2;
        ctxEl.arc(px, py, 12, 0, Math.PI * 2);
        ctxEl.fill();
        ctxEl.stroke();
        ctxEl.closePath();

        // name (use canonical helper so canvas and vote UI match)
        ctxEl.fillStyle = "#062a44";
        ctxEl.font = "12px Inter, sans-serif";
        const displayName = getDisplayName(a);
        ctxEl.fillText(displayName, px + 16, py + 4);

      }

      // draw timer (top-right) if provided
      if (typeof gameState.timerSeconds === 'number') {
        const ts = Math.max(0, Math.floor(gameState.timerSeconds));
        const mins = Math.floor(ts / 60).toString().padStart(2, '0');
        const secs = (ts % 60).toString().padStart(2, '0');
        const label = `${mins}:${secs}`;
        const padding = 8;
        ctxEl.font = "16px Inter, sans-serif";
        const textWidth = ctxEl.measureText(label).width;
        const boxW = textWidth + padding * 2;
        const boxH = 26;
        const boxX = canvasEl.width / (window.devicePixelRatio || 1) - boxW - 12;
        const boxY = 12;
        // background
        ctxEl.fillStyle = "rgba(0,0,0,0.55)";
        roundRect(ctxEl, boxX, boxY, boxW, boxH, 6, true, false);
        // text
        ctxEl.fillStyle = "#fff";
        ctxEl.fillText(label, boxX + padding, boxY + boxH - 8);
      }

      // helper for rounded rect
      function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: boolean, stroke?: boolean) {
        if (typeof r === 'undefined') r = 5;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
      }

      // HUD: connection & instructions
      ctxEl.fillStyle = "#043454";
      ctxEl.font = "13px Inter, sans-serif";
      ctxEl.fillText(`Partida: ${gameState.code} — Usuario: ${currentUser}`, 12, canvasEl.height - 28);
      ctxEl.fillText(connected ? "Conectado" : "Desconectado", 12, canvasEl.height - 10);

      rafId = requestAnimationFrame(draw);
    }

    // set canvas size for devicePixelRatio
    const DPR = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * DPR;
    canvas.height = canvasHeight * DPR;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    const ctxScale = canvas.getContext("2d");
    if (ctxScale) ctxScale.setTransform(DPR, 0, 0, DPR, 0, 0);

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [gameState, canvasWidth, canvasHeight, currentUser, connected]);

  // mouse click to set direction (point towards)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;
    function onClick(e: MouseEvent) {
      const rect = canvasEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clickX = e.clientX;
      const clickY = e.clientY;
      // compute world-space direction assuming world center in canvas center
      const dxPix = clickX - cx;
      const dyPix = cy - clickY; // invert
      // normalize
      const len = Math.hypot(dxPix, dyPix) || 1;
      const dx = dxPix / len;
      const dy = dyPix / len;
      sendMove(dx, dy);
    }
    canvasEl.addEventListener("click", onClick);
    return () => canvasEl.removeEventListener("click", onClick);
  }, [sendMove]);

  // cursor tracking for coords overlay
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;
    function onMove(e: MouseEvent) {
      const rect = canvasEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dxPix = e.clientX - cx;
      const dyPix = cy - e.clientY;
      // convert to world coordinates similarly to worldToPixel inverse
      const w = canvasEl.width / (window.devicePixelRatio || 1);
      const h = canvasEl.height / (window.devicePixelRatio || 1);
      const pixelIslandRadius = Math.min(w, h) * 0.36;
      const scale = (gameState?.island?.radius && gameState.island.radius > 0)
        ? pixelIslandRadius / gameState.island.radius
        : pixelIslandRadius / 100;
      const worldX = dxPix / scale;
      const worldY = dyPix / scale;
      cursorRef.current = { x: worldX, y: worldY };
    }
    function onLeave() { cursorRef.current = null; }
    canvasEl.addEventListener('mousemove', onMove);
    canvasEl.addEventListener('mouseleave', onLeave);
    return () => { canvasEl.removeEventListener('mousemove', onMove); canvasEl.removeEventListener('mouseleave', onLeave); };
  }, [gameState]);

  return (
    <div className="game-container card">
      <div className="header">
        <div className="title">Isla — Partida {matchCode}</div>
        <div className="small-muted">{connected ? "Conectado al servidor" : "Conectando..."}</div>
      </div>

      <canvas ref={canvasRef} />

      {/* Vote button bottom-left */}
      {(() => {
        const isInfiltrator = !!isInfiltratorRef.current;
        return (
          <button
            className="vote-button"
            disabled={isInfiltrator}
            title={isInfiltrator ? 'El infiltrado no puede iniciar votaciones' : 'Iniciar votación'}
            onClick={async () => {
              if (isInfiltratorRef.current) return; // extra guard
              try {
                const res = await fetch(`${BACKEND_BASE}/api/match/${matchCode}/startVote?username=${encodeURIComponent(currentUser)}`, { method: 'POST' });
                if (!res.ok) {
                  const text = await res.text();
                  alert('No se pudo iniciar la votación: ' + text);
                }
              } catch (e) {
                console.error(e);
                alert('Error iniciando votación');
              }
            }}
          >
            Iniciar votación
          </button>
        );
      })()}

      {/* Voting modal */}
      {voteModalOpen && (
        <div className="vote-modal">
          <div className="vote-modal-card">
            <h3>Elige un NPC para expulsar</h3>
            <div className="vote-options">
              {voteOptions.map((o: Avatar) => {
                const displayName = getDisplayName(o);
                return (
                <div key={o.id} className="vote-option">
                  <div>{displayName} — {o.type}</div>
                  <button
                    disabled={hasVoted}
                    onClick={async () => {
                      try {
                        const res = await fetch(`${BACKEND_BASE}/api/match/${matchCode}/vote`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ username: currentUser, targetId: o.id }),
                        });
                        if (res.ok) {
                          setHasVoted(true);
                          alert('Voto registrado correctamente, esperando resultados finales.');
                        } else {
                          const txt = await res.text();
                          alert('Fallo al votar: ' + txt);
                        }
                      } catch (e) {
                        console.error(e);
                        alert('Error al enviar voto');
                      }
                    }}
                  >Votar</button>
                </div>
                  );
                })}
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setVoteModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Vote result modal showing counts */}
      {voteResult && (
        <div className="vote-modal">
          <div className="vote-modal-card">
            <h3>Resultados de la votación</h3>
            <div style={{ marginTop: 8 }}>
              {Object.keys(voteResult.counts).map((k) => {
                const id = Number(k);
                const count = voteResult.counts[id];
                // find avatar to display name (prefer server-provided displayName)
                const av = gameState?.avatars.find(a => a.id === id);
                const name = av ? (av.displayName || av.ownerUsername || npcNameMapRef.current[id] || `NPC-${id}`) : (npcNameMapRef.current[id] || `NPC-${id}`);
                return (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f7f9fb', borderRadius: 6, marginBottom: 6 }}>
                    <div>{name}</div>
                    <div><strong>{count}</strong></div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12 }}>
              <div>{voteResult.message}</div>
              <div style={{ marginTop: 12 }}>
                <button onClick={() => {
                  // if human expelled, redirect; otherwise just close
                  if (voteResult.expelledType === 'human') {
                    window.location.href = '/';
                  } else {
                    setVoteResult(null);
                  }
                }}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <small className="small-muted">
          Controles: WASD / Flechas para moverte; click en el mapa para moverte en esa dirección.
        </small>
      </div>
    </div>
  );
}