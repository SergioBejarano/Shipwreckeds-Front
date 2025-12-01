import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByText(/Combustible del barco:\s*50\s*%/i)).toBeInTheDocument();
    expect(screen.getByText(/Se bloqueará en\s*15\s*s/i)).toBeInTheDocument();
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

  it('deshabilita botón cuando fuelActionPending es true', async () => {
    render(<FuelPanel {...baseProps} fuelActionPending={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/Procesando/i);
  });

  /**
   * FIX REAL: cuando fuelWindowOpen = false, tu componente SÍ muestra un botón,
   * pero deshabilitado. La prueba anterior fallaba porque esperaba que NO existiera.
   */
  it('deshabilita el botón y muestra countdown cuando ventana está cerrada', () => {
    render(
      <FuelPanel
        {...baseProps}
        fuelWindowOpen={false}
        fuelWindowSecondsRemaining={10}
      />
    );

    const button = screen.getByRole('button', { name: /llenar tanque/i });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Tanque de gasolina bloqueado temporalmente');

    expect(screen.getByText(/Disponible en\s*10\s*s/i)).toBeInTheDocument();
  });

  it('llama onFuelAction con FILL cuando jugador normal está cerca del barco', async () => {
    const onFuelAction = vi.fn();
    render(<FuelPanel {...baseProps} onFuelAction={onFuelAction} />);
    const button = screen.getByRole('button', { name: /Llenar tanque/i });
    await userEvent.click(button);
    await waitFor(() => expect(onFuelAction).toHaveBeenCalledWith('FILL'));
  });

  it('llama onFuelAction con SABOTAGE cuando es infiltrador', async () => {
    const onFuelAction = vi.fn();
    render(<FuelPanel {...baseProps} isInfiltrator={true} onFuelAction={onFuelAction} />);
    const button = screen.getByRole('button', { name: /Sabotear/i });
    await userEvent.click(button);
    await waitFor(() => expect(onFuelAction).toHaveBeenCalledWith('SABOTAGE'));
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

    expect(screen.getByText(/Tanque de gasolina disponible\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra countdown disponible en X segundos cuando ventana está cerrada', () => {
    render(<FuelPanel {...baseProps} fuelWindowOpen={false} fuelWindowSecondsRemaining={10} />);
    expect(screen.getByText(/Disponible en\s*10\s*s/i)).toBeInTheDocument();
  });
});
