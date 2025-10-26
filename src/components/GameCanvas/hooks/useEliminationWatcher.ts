import { useEffect, type MutableRefObject } from 'react';
import type { GameState } from '../../../utils/GameCanvas/types';

export function useEliminationWatcher(
  gameState: GameState | null,
  currentUser: string,
  myAvatarIdRef: MutableRefObject<number | null>,
  myAliveRef: MutableRefObject<boolean | null>,
  setEliminationMessage: (value: string | null) => void
) {
  useEffect(() => {
    if (!gameState) {
      return;
    }

    const mine =
      gameState.avatars.find((avatar) => avatar.ownerUsername === currentUser && avatar.type === 'human') ||
      (myAvatarIdRef.current != null
        ? gameState.avatars.find((avatar) => avatar.id === myAvatarIdRef.current)
        : undefined);

    if (!mine) {
      return;
    }

    const currentlyAlive = mine.isAlive !== false;
    const previous = myAliveRef.current;

    if (previous === null) {
      myAliveRef.current = currentlyAlive;
      return;
    }

    if (previous && !currentlyAlive) {
      setEliminationMessage('Has sido eliminado. Serás enviado al lobby.');
    }

    myAliveRef.current = currentlyAlive;
  }, [gameState, currentUser, myAvatarIdRef, myAliveRef, setEliminationMessage]);
}
