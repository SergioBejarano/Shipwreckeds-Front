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

    if (status === 'FINISHED' && fuelPercentage >= 100 && !completionShownRef.current) {
      completionShownRef.current = true;
      return;
    }

    if (status !== 'FINISHED') {
      completionShownRef.current = false;
    }
  }, [gameState, completionShownRef]);
}
