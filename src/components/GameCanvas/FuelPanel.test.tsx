import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FuelPanel } from './FuelPanel';

describe('FuelPanel', () => {
  const baseProps = {
    fuelPercentage: 50,
    fuelWindowMessage: 'Tanque de gasolina disponible.',
    fuelWindowOpen: true,
    fuelWindowSecondsRemaining: 15,
    isGameFinished: false,
    isInfiltrator: false,
    isNearBoat: true,
    fuelActionPending: false,
    onFuelAction: () => Promise.resolve(),
  };

  it('renderiza porcentaje y countdown', () => {
    render(<FuelPanel {...baseProps} />);
    expect(screen.getByText(/Combustible del barco: 50%/i)).toBeInTheDocument();
    expect(screen.getByText(/Se bloqueará en 15s/i)).toBeInTheDocument();
  });

  it('oculta botón cuando no puede interactuar', () => {
    render(<FuelPanel {...baseProps} fuelWindowOpen={false} isNearBoat={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra botón de sabotear para infiltrador', () => {
    render(<FuelPanel {...baseProps} isInfiltrator={true} />);
    expect(screen.getByRole('button', { name: /sabotear/i })).toBeEnabled();
  });
});
