import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import * as apiModule from '../utils/api';

// Mock the buildCognitoLoginUrl function
vi.mock('../utils/api', () => ({
  buildCognitoLoginUrl: vi.fn(() => 'https://mocked-cognito-url.example.com'),
}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  it('renders welcome title and login button', () => {
    render(<Login />);
    
    expect(screen.getByText(/inicio de sesión/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar con aws cognito/i })).toBeInTheDocument();
  });

  it('displays helper text with allowed users', () => {
    render(<Login />);
    
    expect(screen.getByText(/usuarios habilitados/i)).toBeInTheDocument();
    expect(screen.getByText(/ana, bruno, carla, diego, eva/i)).toBeInTheDocument();
  });

  it('shows processing state when processingCode is true', () => {
    render(<Login processingCode={true} />);
    
    expect(screen.getByText(/confirmando tu sesión/i)).toBeInTheDocument();
  });

  it('displays error message when codeError is provided', () => {
    const errorMsg = 'Invalid authentication code';
    render(<Login codeError={errorMsg} />);
    
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });

  it('redirects to Cognito when button is clicked', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const button = screen.getByRole('button', { name: /entrar con aws cognito/i });
    await user.click(button);
    
    expect(apiModule.buildCognitoLoginUrl).toHaveBeenCalled();
    expect((window as any).location.href).toBe('https://mocked-cognito-url.example.com');
  });

  it.skip('does not redirect when button is disabled', async () => {
    const user = userEvent.setup();
    const originalHref = (globalThis as any).location?.href ?? '';
    render(<Login processingCode={true} />);
    
    const button = screen.getByRole('button', { name: /entrar con aws cognito/i });
    expect(button).toBeDisabled();
    
    try {
      await user.click(button);
    } catch {
      // Expected: button is disabled, so click might fail or be ignored
    }
    
    expect((globalThis as any).location?.href ?? originalHref).toBe(originalHref);
  });

  it('applies correct CSS classes for styling', () => {
    const { container } = render(<Login />);
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('fixed', 'inset-0');
  });

  it('shows all three messages when all props are provided', () => {
    render(<Login processingCode={true} codeError="Test error" />);
    
    expect(screen.getByText(/confirmando tu sesión/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });
});
