import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { RefObject } from 'react';
import { useNpcAliasRegistry } from './useNpcAliasRegistry';
import type { Avatar, GameState } from '../../../utils/GameCanvas/types';

const createRef = <T,>(value: T): RefObject<T> => ({ current: value } as RefObject<T>);

const buildNpc = (id: number, partial: Partial<Avatar> = {}): Avatar => ({
  id,
  type: 'npc',
  x: 0,
  y: 0,
  ...partial,
});

const buildHuman = (id: number, partial: Partial<Avatar> = {}): Avatar => ({
  id,
  type: 'human',
  x: 0,
  y: 0,
  ...partial,
});

const buildGameState = (avatars: Avatar[]): GameState => ({
  code: 'TEST',
  avatars,
  island: { cx: 0, cy: 0, radius: 100 },
});

describe('useNpcAliasRegistry', () => {
  it('uses server-provided alias and bumps counter forward', async () => {
    const mapRef = createRef<Record<number, string>>({});
    const counterRef = createRef(5);
    const state = buildGameState([
      buildNpc(7, { displayName: 'NPC-42' }),
    ]);

    renderHook(({ gameState }) => useNpcAliasRegistry(gameState, mapRef, counterRef), {
      initialProps: { gameState: state },
    });

    await waitFor(() => {
      expect(mapRef.current[7]).toBe('NPC-42');
    });
    expect(counterRef.current).toBe(43);
  });

  it('generates unique aliases when missing or duplicate names are encountered', async () => {
    const mapRef = createRef<Record<number, string>>({ 10: 'NPC-100000' });
    const counterRef = createRef(100000);
    const state = buildGameState([
      buildNpc(10),
      buildNpc(11),
      buildNpc(12, { displayName: 'NPC-100000' }),
      buildHuman(99, { displayName: 'Player-99' }),
    ]);

    renderHook(({ gameState }) => useNpcAliasRegistry(gameState, mapRef, counterRef), {
      initialProps: { gameState: state },
    });

    await waitFor(() => {
      expect(mapRef.current[10]).toBe('NPC-100000');
      expect(mapRef.current[11]).toBe('NPC-100001');
      expect(mapRef.current[12]).toBe('NPC-100002');
    });
    expect(counterRef.current).toBe(100003);
  });

  it('removes aliases for NPCs that are no longer present', async () => {
    const mapRef = createRef<Record<number, string>>({ 1: 'NPC-1', 2: 'NPC-2' });
    const counterRef = createRef(3);
    const state = buildGameState([
      buildNpc(2),
      buildNpc(3),
    ]);

    renderHook(({ gameState }) => useNpcAliasRegistry(gameState, mapRef, counterRef), {
      initialProps: { gameState: state },
    });

    await waitFor(() => {
      expect(mapRef.current[1]).toBeUndefined();
      expect(mapRef.current[2]).toBe('NPC-2');
      expect(mapRef.current[3]).toMatch(/^NPC-/);
    });
  });
});
