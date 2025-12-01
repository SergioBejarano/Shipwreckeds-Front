import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

  it('muestra estado finalizado cuando isGameFinished es true', () => {
    render(<FuelPanel {...baseProps} isGameFinished={true} />);
    expect(screen.getByText(/Partida finalizada/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('deshabilita botón cuando fuelActionPending es true', () => {
    render(<FuelPanel {...baseProps} fuelActionPending={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/Procesando/i);
  });

  it('deshabilita botón cuando ventana está cerrada', () => {
    render(<FuelPanel {...baseProps} fuelWindowOpen={false} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('llama onFuelAction con FILL cuando jugador normal está cerca del barco', async () => {
    const onFuelAction = vi.fn();
    render(
      <FuelPanel {...baseProps} onFuelAction={onFuelAction} />
    );
    const button = screen.getByRole('button', { name: /Llenar tanque/i });
    button.click();
    expect(onFuelAction).toHaveBeenCalledWith('FILL');
  });

  it('llama onFuelAction con SABOTAGE cuando es infiltrador', async () => {
    const onFuelAction = vi.fn();
    render(
      <FuelPanel {...baseProps} isInfiltrator={true} onFuelAction={onFuelAction} />
    );
    const button = screen.getByRole('button', { name: /Sabotear/i });
    button.click();
    expect(onFuelAction).toHaveBeenCalledWith('SABOTAGE');
  });

  it('muestra mensaje cuando no está cerca del barco', () => {
    render(
      <FuelPanel
        {...baseProps}
        fuelWindowOpen={true}
        isNearBoat={false}
        isInfiltrator={false}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Debes acercarte al barco');
  });

  it('muestra countdown disponible en X segundos cuando ventana está cerrada', () => {
    render(
      <FuelPanel {...baseProps} fuelWindowOpen={false} fuelWindowSecondsRemaining={10} />
    );
    expect(screen.getByText(/Disponible en 10s/i)).toBeInTheDocument();
  });
});
