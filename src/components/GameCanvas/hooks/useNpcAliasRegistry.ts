import { useEffect, type RefObject } from 'react';
import type { Avatar, GameState } from '../../../utils/GameCanvas/types';

const NPC_ALIAS_REGEX = /^NPC-\d+$/i;

type AliasContext = {
  aliasOwners: Map<string, number>;
  used: Set<string>;
};

function seedAliasContext(map: Record<number, string>): AliasContext {
  const aliasOwners = new Map<string, number>();
  const used = new Set<string>();
  for (const [idStr, alias] of Object.entries(map)) {
    if (typeof alias === 'string' && NPC_ALIAS_REGEX.test(alias)) {
      const idNum = Number(idStr);
      aliasOwners.set(alias, idNum);
      used.add(alias);
    }
  }
  return { aliasOwners, used };
}

function persistAliases(target: Record<number, string>, nextAliases: Record<number, string>, activeNpcIds: Set<number>) {
  for (const [idStr, alias] of Object.entries(nextAliases)) {
    target[Number(idStr)] = alias;
  }
  for (const idStr of Object.keys(target)) {
    const idNum = Number(idStr);
    if (!activeNpcIds.has(idNum)) {
      delete target[idNum];
    }
  }
}

export function useNpcAliasRegistry(
  gameState: GameState | null,
  npcNameMapRef: RefObject<Record<number, string>>,
  npcAliasCounterRef: RefObject<number>
) {
  useEffect(() => {
    if (!gameState) {
      return;
    }

    const map = npcNameMapRef.current;
    const { aliasOwners, used } = seedAliasContext(map);
    const nextAliases: Record<number, string> = {};
    const activeNpcIds = new Set<number>();

    const tryUseAlias = (candidate: string | null | undefined, id: number) => {
      if (!candidate || !NPC_ALIAS_REGEX.test(candidate) || used.has(candidate)) {
        const owner = candidate ? aliasOwners.get(candidate) : undefined;
        if (owner === id) {
          return candidate;
        }
        return null;
      }
      const numeric = parseInt(candidate.split('-')[1], 10);
      if (!Number.isNaN(numeric)) {
        npcAliasCounterRef.current = Math.max(npcAliasCounterRef.current, numeric + 1);
      }
      return candidate;
    };

    const generateAlias = () => {
      while (true) {
        const candidate = `NPC-${npcAliasCounterRef.current}`;
        npcAliasCounterRef.current += 1;
        if (!used.has(candidate)) {
          return candidate;
        }
      }
    };

    const assignAlias = (avatar: Avatar) => {
      if (avatar.type !== 'npc') {
        return;
      }
      activeNpcIds.add(avatar.id);

      const serverAlias = typeof avatar.displayName === 'string' ? avatar.displayName : null;
      const currentAlias = typeof map[avatar.id] === 'string' ? map[avatar.id] : null;
      if (currentAlias) {
        used.delete(currentAlias);
      }
      const alias = tryUseAlias(serverAlias, avatar.id)
        ?? tryUseAlias(currentAlias, avatar.id)
        ?? generateAlias();
      nextAliases[avatar.id] = alias;
      used.add(alias);
      aliasOwners.set(alias, avatar.id);
    };

    gameState.avatars.forEach(assignAlias);
    persistAliases(map, nextAliases, activeNpcIds);
  }, [gameState, npcNameMapRef, npcAliasCounterRef]);
}
