import { useEffect, useRef } from 'react';
import type { Client } from '@stomp/stompjs';
import type { GameState, Avatar } from './types';

type Params = {
  clientRef: React.MutableRefObject<Client | null>;
  matchCode: string;
  currentUser: string;
  getMyAvatar: () => Avatar | undefined;
  gameState: GameState | null;
};

export function useMovement({ clientRef, matchCode, currentUser, getMyAvatar, gameState }: Params) {
  const keysRef = useRef<Record<string, boolean>>({});
  const sendIntervalRef = useRef<number | null>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);

  // send move helper (includes client-side clamp)
  const sendMove = (dx: number, dy: number) => {
    const client = clientRef.current;
    if (!client || client.connected === false) return;
    const myAvatar = getMyAvatar();
    if (!myAvatar || !gameState) return;

    const island = gameState.island || { cx: 0, cy: 0, radius: 100 };
    const step = (island.radius || 100) * 0.035;
    const proposedX = myAvatar.x + dx * step;
    const proposedY = myAvatar.y + dy * step;
    const distToCenter = Math.hypot(proposedX - island.cx, proposedY - island.cy);
    const margin = 1;
    let finalDx = dx;
    let finalDy = dy;

    if (distToCenter > (island.radius - margin)) {
      const vecX = proposedX - island.cx;
      const vecY = proposedY - island.cy;
      const len = Math.hypot(vecX, vecY) || 1;
      const clampedX = island.cx + (vecX / len) * (island.radius - margin);
      const clampedY = island.cy + (vecY / len) * (island.radius - margin);
      const ndx = clampedX - myAvatar.x;
      const ndy = clampedY - myAvatar.y;
      const nlen = Math.hypot(ndx, ndy) || 1;
      finalDx = ndx / nlen;
      finalDy = ndy / nlen;
      if (Math.hypot(ndx, ndy) < 1e-3) return;
    }

    const body = {
      username: currentUser,
      avatarId: myAvatar.id,
      direction: { dx: finalDx, dy: finalDy },
    };
    try {
      client.publish({ destination: `/app/game/${matchCode}/move`, body: JSON.stringify(body) });
    } catch (e) {
      // ignore
    }
  };

  // keyboard handlers
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { keysRef.current[e.key.toLowerCase()] = true; }
    function onKeyUp(e: KeyboardEvent) { keysRef.current[e.key.toLowerCase()] = false; }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  // periodic sender
  useEffect(() => {
    const T = 1000 / 8;
    sendIntervalRef.current = window.setInterval(() => {
      const k = keysRef.current;
      let dx = 0, dy = 0;
      if (k['arrowup'] || k['w']) dy -= 1;
      if (k['arrowdown'] || k['s']) dy += 1;
      if (k['arrowleft'] || k['a']) dx -= 1;
      if (k['arrowright'] || k['d']) dx += 1;
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1;
        sendMove(dx / len, dy / len);
      }
    }, T);
    return () => { if (sendIntervalRef.current) { clearInterval(sendIntervalRef.current); sendIntervalRef.current = null; } };
  }, [sendMove]);

  // click to move and cursor tracking are left to component to attach to canvas if needed
  function handleCanvasClick(e: MouseEvent) {
    const target = e.currentTarget as Element | null;
    if (!target) return;
    const rect = (target as Element).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clickX = e.clientX;
    const clickY = e.clientY;
    const dxPix = clickX - cx;
    const dyPix = cy - clickY;
    const len = Math.hypot(dxPix, dyPix) || 1;
    const dx = dxPix / len;
    const dy = dyPix / len;
    sendMove(dx, dy);
  }

  function handleMouseMove(e: MouseEvent) {
    const target = e.currentTarget as Element | null;
    if (!target) { cursorRef.current = null; return; }
    const rect = (target as Element).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dxPix = e.clientX - cx;
    const dyPix = cy - e.clientY;
    // scale unknown here; component can translate using gameState if needed
    cursorRef.current = { x: dxPix, y: dyPix };
  }

  return { sendMove, handleCanvasClick, handleMouseMove, cursorRef };
}
