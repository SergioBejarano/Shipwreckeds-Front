import { useCallback, useMemo, useState } from 'react';
import type { Avatar, GameState } from '../../../utils/GameCanvas/types';

type FuelControlsParams = {
  gameState: GameState | null;
  backendBase: string;
  matchCode: string;
  currentUser: string;
  getMyAvatar: () => Avatar | undefined;
};

export type FuelAction = 'FILL' | 'SABOTAGE';

type FuelControls = {
  fuelPercentage: number;
  fuelWindowOpen: boolean;
  fuelWindowSecondsRemaining: number;
  fuelWindowMessage: string;
  isGameFinished: boolean;
  isNearBoat: boolean;
  isInfiltrator: boolean;
  fuelActionPending: boolean;
  handleFuelAction: (action: FuelAction) => Promise<void>;
};

const clampFuel = (value: number | undefined | null): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
};

export function useFuelControls({
  gameState,
  backendBase,
  matchCode,
  currentUser,
  getMyAvatar,
}: FuelControlsParams): FuelControls {
  const [fuelActionPending, setFuelActionPending] = useState(false);

  const fuelPercentage = useMemo(() => clampFuel(gameState?.fuelPercentage), [gameState?.fuelPercentage]);

  const status = gameState?.status?.toUpperCase() ?? '';
  const isGameFinished = status === 'FINISHED';

  const fuelWindowOpen = !!gameState?.fuelWindowOpen;
  const fuelWindowSecondsRemaining = gameState?.fuelWindowSecondsRemaining ?? 0;
  const fuelWindowMessage = fuelWindowOpen ? 'Tanque de gasolina disponible.' : 'Tanque de gasolina bloqueado.';

  const myAvatar = getMyAvatar();
  const boatInfo = gameState?.boat;
  const interactionRadius = boatInfo?.interactionRadius ?? 25;
  const isNearBoat = !!(myAvatar && boatInfo && Math.hypot(myAvatar.x - boatInfo.x, myAvatar.y - boatInfo.y) <= interactionRadius);
  const isInfiltrator = !!myAvatar?.isInfiltrator;

  const handleFuelAction = useCallback(async (action: FuelAction) => {
    if (!gameState || isGameFinished) {
      return;
    }
    if (!fuelWindowOpen) {
      alert('Tanque de gasolina bloqueado. Espera a que esté disponible.');
      return;
    }

    const mine = getMyAvatar();
    const boat = gameState.boat;

    if (!mine || !boat) {
      alert('No es posible interactuar con el barco en este momento.');
      return;
    }

    const dist = Math.hypot(mine.x - boat.x, mine.y - boat.y);
    const radius = boat.interactionRadius ?? 25;
    const requiresProximity = action === 'FILL' || !mine.isInfiltrator;

    if (requiresProximity && dist > radius) {
      alert('Debes acercarte al barco.');
      return;
    }

    setFuelActionPending(true);

    try {
      const res = await fetch(`${backendBase}/api/match/${matchCode}/fuel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, action }),
      });

      if (!res.ok) {
        const txt = await res.text();
        alert('No se pudo actualizar el combustible: ' + txt);
      }
    } catch (error) {
      console.error(error);
      alert('Error al interactuar con el combustible.');
    } finally {
      setFuelActionPending(false);
    }
  }, [backendBase, currentUser, fuelWindowOpen, gameState, getMyAvatar, isGameFinished, matchCode]);

  return {
    fuelPercentage,
    fuelWindowOpen,
    fuelWindowSecondsRemaining,
    fuelWindowMessage,
    isGameFinished,
    isNearBoat,
    isInfiltrator,
    fuelActionPending,
    handleFuelAction,
  };
}
