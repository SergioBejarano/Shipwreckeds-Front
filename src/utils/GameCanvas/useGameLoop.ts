import { useEffect } from 'react';
import type { Avatar, GameState } from './types';

type Params = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  barcoImgRef: React.RefObject<HTMLImageElement | null>;
  gameState: GameState | null;
  currentUser: string;
  canvasWidth: number;
  canvasHeight: number;
  connected: boolean;
  getDisplayName: (a: Avatar) => string;
  npcNameMapRef: React.MutableRefObject<Record<number, string>>;
};

export function useGameLoop({ canvasRef, barcoImgRef, gameState, currentUser, canvasWidth, canvasHeight, connected, getDisplayName, npcNameMapRef }: Params) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;

    const canvasEl = canvas as HTMLCanvasElement;
    const ctxEl = ctx as CanvasRenderingContext2D;

    function worldToPixel(x: number, y: number) {
      const w = canvasEl.width / (window.devicePixelRatio || 1);
      const h = canvasEl.height / (window.devicePixelRatio || 1);
      const pixelIslandRadius = Math.min(w, h) * 0.36;
      const scale = (gameState?.island?.radius && gameState.island.radius > 0)
        ? pixelIslandRadius / gameState.island.radius
        : pixelIslandRadius / 100;
      const cx = w / 2;
      const cy = h / 2;
      return {
        px: cx + x * scale,
        py: cy - y * scale,
        scale,
        islandPixelRadius: pixelIslandRadius,
        centerX: cx,
        centerY: cy
      };
    }

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

    function draw() {
  ctxEl.clearRect(0, 0, canvasEl.width, canvasEl.height);

      // sea
  ctxEl.fillStyle = '#9ad0ff';
  ctxEl.fillRect(0, 0, canvasEl.width, canvasEl.height);

      if (!gameState) {
        ctxEl.fillStyle = '#023e8a';
        ctxEl.font = '18px Inter, sans-serif';
        ctxEl.fillText('Esperando estado del juego...', 20, 40);
        rafId = requestAnimationFrame(draw);
        return;
      }

    const island = gameState.island || { cx: 0, cy: 0, radius: 100 };
    const { islandPixelRadius, centerX, centerY, scale } = worldToPixel(island.cx, island.cy);

  const grad = ctxEl.createRadialGradient(centerX, centerY, islandPixelRadius * 0.1, centerX, centerY, islandPixelRadius);
  grad.addColorStop(0, '#7BD389');
  grad.addColorStop(0.7, '#E8D8A8');
  ctxEl.beginPath();
  ctxEl.fillStyle = grad;
  ctxEl.arc(centerX, centerY, islandPixelRadius, 0, Math.PI * 2);
  ctxEl.fill();
  ctxEl.closePath();

      // boat
      const boatImg = barcoImgRef.current;
      const boatInfo = gameState.boat;
      const boatMetrics = boatInfo ? worldToPixel(boatInfo.x, boatInfo.y) : null;
    const boatPx = boatMetrics ? boatMetrics.px : centerX + islandPixelRadius + 6 + (islandPixelRadius * 0.25);
    const boatPy = boatMetrics ? boatMetrics.py : centerY;
    const boatScale = boatMetrics ? boatMetrics.scale : scale;
  const boatW = islandPixelRadius * 0.85;
  const boatH = boatW * 0.55;
      const drawX = boatPx - boatW / 2;
      const drawY = boatPy - boatH / 2;
      if (boatInfo && boatInfo.interactionRadius) {
  const interactionPx = boatInfo.interactionRadius * boatScale * 1.75;
        ctxEl.save();
        ctxEl.strokeStyle = 'rgba(6, 182, 212, 0.25)';
        ctxEl.setLineDash([8, 10]);
        ctxEl.lineWidth = 2;
        ctxEl.beginPath();
        ctxEl.arc(boatPx, boatPy, interactionPx, 0, Math.PI * 2);
        ctxEl.stroke();
        ctxEl.restore();
      }
      if (boatImg && boatImg.complete) {
        ctxEl.drawImage(boatImg, drawX, drawY, boatW, boatH);
      } else {
        ctxEl.fillStyle = '#6b3e26';
        ctxEl.fillRect(drawX, drawY, boatW, boatH);
        ctxEl.strokeStyle = '#3b2b1f';
        ctxEl.strokeRect(drawX, drawY, boatW, boatH);
      }

      // avatars (skip eliminated)
      for (const a of gameState.avatars) {
        if (a.isAlive === false) continue;
        const { px, py } = worldToPixel(a.x, a.y);
        let fill = a.type === 'human' ? '#3b82f6' : '#ef476f';
        if (a.type === 'human' && a.ownerUsername === currentUser) fill = '#06b6d4';

        ctxEl.beginPath();
        ctxEl.fillStyle = 'rgba(0,0,0,0.12)';
        ctxEl.ellipse(px + 3, py + 6, 10, 5, 0, 0, Math.PI * 2);
        ctxEl.fill();
        ctxEl.closePath();

        ctxEl.beginPath();
        ctxEl.fillStyle = fill;
  ctxEl.strokeStyle = '#ffffff';
  ctxEl.lineWidth = 2;
        ctxEl.arc(px, py, 12, 0, Math.PI * 2);
        ctxEl.fill();
        ctxEl.stroke();
        ctxEl.closePath();

        ctxEl.fillStyle = '#062a44';
        ctxEl.font = '12px Inter, sans-serif';
        const displayName = getDisplayName(a);
        ctxEl.fillText(displayName, px + 16, py + 4);
      }

      // timer
      if (typeof gameState.timerSeconds === 'number') {
        const ts = Math.max(0, Math.floor(gameState.timerSeconds));
        const mins = Math.floor(ts / 60).toString().padStart(2, '0');
        const secs = (ts % 60).toString().padStart(2, '0');
        const label = `${mins}:${secs}`;
        const padding = 8;
  ctxEl.font = '16px Inter, sans-serif';
  const textWidth = ctxEl.measureText(label).width;
        const boxW = textWidth + padding * 2;
        const boxH = 26;
  const boxX = canvasEl.width / (window.devicePixelRatio || 1) - boxW - 12;
  const boxY = 12;
        ctxEl.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctxEl, boxX, boxY, boxW, boxH, 6, true, false);
        ctxEl.fillStyle = '#fff';
        ctxEl.fillText(label, boxX + padding, boxY + boxH - 8);
      }

      // HUD
  ctxEl.fillStyle = '#043454';
  ctxEl.font = '13px Inter, sans-serif';
  ctxEl.fillText(`Partida: ${gameState.code} — Usuario: ${currentUser}`, 12, canvasEl.height - 28);
  ctxEl.fillText(connected ? 'Conectado' : 'Desconectado', 12, canvasEl.height - 10);

      rafId = requestAnimationFrame(draw);
    }

    const DPR = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * DPR;
    canvas.height = canvasHeight * DPR;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    const ctxScale = canvas.getContext('2d');
    if (ctxScale) ctxScale.setTransform(DPR, 0, 0, DPR, 0, 0);

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [canvasRef, barcoImgRef, gameState, currentUser, canvasWidth, canvasHeight, connected, getDisplayName, npcNameMapRef]);
}