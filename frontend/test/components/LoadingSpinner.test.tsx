import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders small size spinner', () => {
    const { container } = render(<LoadingSpinner size="small" />);
    
    const spinner = container.querySelector('.w-4.h-4');
    expect(spinner).toBeInTheDocument();
  });

  it('renders medium size spinner', () => {
    const { container } = render(<LoadingSpinner size="medium" />);
    
    const spinner = container.querySelector('.w-6.h-6');
    expect(spinner).toBeInTheDocument();
  });

  it('renders large size spinner', () => {
    const { container } = render(<LoadingSpinner size="large" />);
    
    const spinner = container.querySelector('.w-8.h-8');
    expect(spinner).toBeInTheDocument();
  });

  it('renders inline position', () => {
    const { container } = render(<LoadingSpinner position="inline" />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('inline-block');
  });

  it('renders overlay position', () => {
    const { container } = render(<LoadingSpinner position="overlay" />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('absolute');
    expect(wrapper.className).toContain('inset-0');
  });

  it('renders center position', () => {
    const { container } = render(<LoadingSpinner position="center" />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('items-center');
    expect(wrapper.className).toContain('justify-center');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('has spinning animation', () => {
    const { container } = render(<LoadingSpinner />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Loading');
  });
});
