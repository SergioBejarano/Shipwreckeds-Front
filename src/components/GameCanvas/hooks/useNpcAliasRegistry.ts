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
    const used = new Set<string>();
    const nextAliases: Record<number, string> = {};

    const tryUseAlias = (candidate: string | null | undefined) => {
      if (!candidate || !NPC_ALIAS_REGEX.test(candidate) || used.has(candidate)) {
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

      const currentAlias = typeof map[avatar.id] === 'string' ? map[avatar.id] : null;
      const serverAlias = typeof avatar.displayName === 'string' ? avatar.displayName : null;
      const alias = tryUseAlias(currentAlias) ?? tryUseAlias(serverAlias) ?? generateAlias();
      nextAliases[avatar.id] = alias;
      used.add(alias);
    }

    for (const key of Object.keys(map)) {
      const idNum = Number(key);
      if (!Number.isNaN(idNum) && !(idNum in nextAliases)) {
        delete map[idNum];
      }
    }

    for (const [idStr, alias] of Object.entries(nextAliases)) {
      map[Number(idStr)] = alias;
    }
  }, [gameState, npcNameMapRef, npcAliasCounterRef]);
}
