import { useEffect, type MutableRefObject } from 'react';
import type { GameState } from '../../../utils/GameCanvas/types';

const NPC_ALIAS_REGEX = /^NPC-\d+$/i;

export function useNpcAliasRegistry(
  gameState: GameState | null,
  npcNameMapRef: MutableRefObject<Record<number, string>>,
  npcAliasCounterRef: MutableRefObject<number>
) {
  useEffect(() => {
    if (!gameState) {
      return;
    }

    const map = npcNameMapRef.current;
    const aliasOwners = new Map<string, number>();
    const used = new Set<string>();
    const nextAliases: Record<number, string> = {};

    for (const [idStr, alias] of Object.entries(map)) {
      if (typeof alias === 'string' && NPC_ALIAS_REGEX.test(alias)) {
        const idNum = Number(idStr);
        aliasOwners.set(alias, idNum);
        used.add(alias);
      }
    }

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

    for (const avatar of gameState.avatars) {
      if (avatar.type !== 'npc') {
        continue;
      }

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
    }

    for (const [idStr, alias] of Object.entries(nextAliases)) {
      map[Number(idStr)] = alias;
    }
  }, [gameState, npcNameMapRef, npcAliasCounterRef]);
}
