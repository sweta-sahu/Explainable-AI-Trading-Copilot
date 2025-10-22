import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoPill } from '../../src/components/InfoPill';

describe('InfoPill', () => {
  it('renders label and value', () => {
    render(<InfoPill label="Confidence" value="High" />);
    
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders with different label and value', () => {
    render(<InfoPill label="Volatility" value="Medium" />);
    
    expect(screen.getByText('Volatility')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('label has uppercase styling', () => {
    const { container } = render(<InfoPill label="Test Label" value="Test Value" />);
    
    const label = screen.getByText('Test Label');
    expect(label.className).toContain('uppercase');
  });

  it('has proper container styling', () => {
    const { container } = render(<InfoPill label="Test" value="Value" />);
    
    const pill = container.firstChild as HTMLElement;
    expect(pill.className).toContain('rounded-lg');
    expect(pill.className).toContain('border');
  });

  it('value has larger font than label', () => {
    render(<InfoPill label="Label" value="Value" />);
    
    const label = screen.getByText('Label');
    const value = screen.getByText('Value');
    
    expect(label.className).toContain('text-[11px]');
    expect(value.className).toContain('text-base');
  });
});
