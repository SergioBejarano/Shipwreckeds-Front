import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Portada from './Portada';

describe('Portada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the welcome button', () => {
    const mockOnIniciarSesion = vi.fn();
    render(<Portada onIniciarSesion={mockOnIniciarSesion} />);
    
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('calls onIniciarSesion when button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnIniciarSesion = vi.fn();
    render(<Portada onIniciarSesion={mockOnIniciarSesion} />);
    
    const button = screen.getByRole('button', { name: /iniciar sesión/i });
    await user.click(button);
    
    expect(mockOnIniciarSesion).toHaveBeenCalledOnce();
  });

  it('shows loading state when processingCode is true', () => {
    const mockOnIniciarSesion = vi.fn();
    render(<Portada onIniciarSesion={mockOnIniciarSesion} processingCode={true} />);
    
    expect(screen.getByRole('button', { name: /redirigiendo/i })).toBeInTheDocument();
  });

  it('disables button when processingCode is true', () => {
    const mockOnIniciarSesion = vi.fn();
    render(<Portada onIniciarSesion={mockOnIniciarSesion} processingCode={true} />);
    
    const button = screen.getByRole('button', { name: /redirigiendo/i });
    expect(button).toBeDisabled();
  });

  it('displays error message when codeError is provided', () => {
    const mockOnIniciarSesion = vi.fn();
    const errorMsg = 'Authentication failed';
    render(<Portada onIniciarSesion={mockOnIniciarSesion} codeError={errorMsg} />);
    
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });

  it('button remains enabled when processingCode is false', () => {
    const mockOnIniciarSesion = vi.fn();
    render(<Portada onIniciarSesion={mockOnIniciarSesion} processingCode={false} />);
    
    const button = screen.getByRole('button', { name: /iniciar sesión/i });
    expect(button).toBeEnabled();
  });

  it('shows normal button text when not processing', () => {
    const mockOnIniciarSesion = vi.fn();
    render(<Portada onIniciarSesion={mockOnIniciarSesion} processingCode={false} />);
    
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.queryByText(/redirigiendo/i)).not.toBeInTheDocument();
  });

  it('applies background image styling', () => {
    const mockOnIniciarSesion = vi.fn();
    const { container } = render(<Portada onIniciarSesion={mockOnIniciarSesion} />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('relative', 'flex', 'items-center');
  });

  it('renders multiple times with different states', async () => {
    const user = userEvent.setup();
    const mockOnIniciarSesion = vi.fn();
    const { rerender } = render(<Portada onIniciarSesion={mockOnIniciarSesion} processingCode={false} />);
    
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    
    rerender(<Portada onIniciarSesion={mockOnIniciarSesion} processingCode={true} />);
    expect(screen.getByRole('button', { name: /redirigiendo/i })).toBeInTheDocument();
  });
});
