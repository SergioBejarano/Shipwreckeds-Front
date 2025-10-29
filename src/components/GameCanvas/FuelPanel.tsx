import type { FuelAction } from './hooks/useFuelControls';

type FuelPanelProps = {
  fuelPercentage: number;
  fuelWindowMessage: string;
  fuelWindowOpen: boolean;
  fuelWindowSecondsRemaining: number;
  isGameFinished: boolean;
  isInfiltrator: boolean;
  isNearBoat: boolean;
  fuelActionPending: boolean;
  onFuelAction: (action: FuelAction) => Promise<void> | void;
};

const getButtonTitle = (
  fuelWindowOpen: boolean,
  isInfiltrator: boolean,
  isNearBoat: boolean,
): string | undefined => {
  if (!fuelWindowOpen) {
    return 'Tanque de gasolina bloqueado temporalmente';
  }
  if (isInfiltrator || isNearBoat) {
    return undefined;
  }
  return 'Debes acercarte al barco';
};

export function FuelPanel({
  fuelPercentage,
  fuelWindowMessage,
  fuelWindowOpen,
  fuelWindowSecondsRemaining,
  isGameFinished,
  isInfiltrator,
  isNearBoat,
  fuelActionPending,
  onFuelAction,
}: FuelPanelProps) {
  const shouldShowButton = (isInfiltrator || isNearBoat) && !isGameFinished;
  const buttonLabel = fuelActionPending ? 'Procesando...' : (isInfiltrator ? 'Sabotear' : 'Llenar tanque');

  return (
    <div className="fuel-panel">
      <div className="fuel-progress">
        <div className="fuel-progress__fill" style={{ width: `${fuelPercentage}%` }} />
      </div>
      <div className="fuel-meta">
        <div>
          <span>
            Combustible del barco: {fuelPercentage.toFixed(0)}%
            {isGameFinished ? ' — Partida finalizada' : ''}
          </span>
          <div className={`fuel-window${fuelWindowOpen ? ' available' : ' locked'}`}>
            {fuelWindowMessage}
            {fuelWindowSecondsRemaining > 0 && (
              <span className="fuel-window__countdown">
                {fuelWindowOpen ? ' Se bloqueará en ' : ' Disponible en '}
                {fuelWindowSecondsRemaining}s
              </span>
            )}
          </div>
        </div>
        {shouldShowButton && (
          <button
            className={`fuel-action-button${isInfiltrator ? ' sabotage' : ''}`}
            onClick={() => onFuelAction(isInfiltrator ? 'SABOTAGE' : 'FILL')}
            disabled={!fuelWindowOpen || fuelActionPending}
            title={getButtonTitle(fuelWindowOpen, isInfiltrator, isNearBoat)}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
