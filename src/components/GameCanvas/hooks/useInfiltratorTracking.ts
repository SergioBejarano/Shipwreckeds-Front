import { useEffect, type MutableRefObject } from 'react';
import type { GameState } from '../../../utils/GameCanvas/types';

export function useInfiltratorTracking(
  gameState: GameState | null,
  currentUser: string,
  myAvatarIdRef: MutableRefObject<number | null>,
  isInfiltratorRef: MutableRefObject<boolean>
) {
  useEffect(() => {
    if (!gameState) {
      isInfiltratorRef.current = false;
      return;
    }

    const mine =
      gameState.avatars.find((avatar) => avatar.ownerUsername === currentUser && avatar.type === 'human') ||
      (myAvatarIdRef.current != null
        ? gameState.avatars.find((avatar) => avatar.id === myAvatarIdRef.current)
        : undefined);

    isInfiltratorRef.current = !!(mine && mine.isInfiltrator);
  }, [gameState, currentUser, myAvatarIdRef, isInfiltratorRef]);
}
