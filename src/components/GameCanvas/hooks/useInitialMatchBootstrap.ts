import { useEffect, type MutableRefObject } from 'react';
import { getMatch } from '../../../utils/api';
import type { Avatar, GameState } from '../../../utils/GameCanvas/types';

export function useInitialMatchBootstrap(
  matchCode: string,
  currentUser: string,
  setGameState: (state: GameState | null) => void,
  myAvatarIdRef: MutableRefObject<number | null>
) {
  useEffect(() => {
    let mounted = true;

    const fetchInitial = async () => {
      try {
        const match = await getMatch(matchCode);
        if (!mounted || !match || match.status !== 'STARTED') {
          return;
        }

        const island = { cx: 0, cy: 0, radius: 100 };
        const avatars: Avatar[] = [];

        if (Array.isArray(match.players)) {
          for (const player of match.players) {
            const pos = player.position || { x: 0, y: 0 };
            if (player.isInfiltrator) {
              avatars.push({
                id: player.id,
                type: 'npc',
                ownerUsername: null,
                x: pos.x,
                y: pos.y,
                isInfiltrator: true,
                isAlive: player.isAlive,
              });
            } else {
              avatars.push({
                id: player.id,
                type: 'human',
                ownerUsername: player.username,
                x: pos.x,
                y: pos.y,
                isInfiltrator: !!player.isInfiltrator,
                isAlive: player.isAlive,
              });
            }
            if (player.username === currentUser) {
              myAvatarIdRef.current = player.id;
            }
          }
        }

        if (Array.isArray(match.npcs)) {
          for (const npc of match.npcs) {
            const pos = npc.position || { x: 0, y: 0 };
            avatars.push({
              id: npc.id,
              type: 'npc',
              ownerUsername: null,
              x: pos.x,
              y: pos.y,
              isInfiltrator: !!npc.infiltrator,
              isAlive: npc.active !== false,
            });
          }
        }

        setGameState({ code: matchCode, timestamp: Date.now(), island, avatars });
      } catch {
        // ignore bootstrap failures; live updates will arrive via WebSocket
      }
    };

    fetchInitial();
    return () => {
      mounted = false;
    };
  }, [matchCode, currentUser, setGameState, myAvatarIdRef]);
}
