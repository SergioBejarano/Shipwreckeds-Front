import { useEffect, type MutableRefObject } from 'react';
import type { GameState } from '../../../utils/GameCanvas/types';

export function useCompletionNotifier(
  gameState: GameState | null,
  completionShownRef: MutableRefObject<boolean>
) {
  useEffect(() => {
    if (!gameState) {
      completionShownRef.current = false;
      return;
    }

    const status = (gameState.status ?? '').toUpperCase();
    const fuelPercentage = gameState.fuelPercentage ?? 0;

    if (status === 'FINISHED' && fuelPercentage >= 100) {
      if (!completionShownRef.current) {
        completionShownRef.current = true;
        alert('Partida terminada, ganaron los naufragos.');
      }
      return;
    }

    if (status !== 'FINISHED') {
      completionShownRef.current = false;
    }
  }, [gameState, completionShownRef]);
}
