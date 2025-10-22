import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FactorList } from '../../src/components/FactorList';
import type { Factor } from '../../src/types';

const mockFactors: Factor[] = [
  { name: 'RSI', shap: 0.5 },
  { name: 'Volume', shap: 0.3 },
  { name: 'Moving Average', shap: 0.2 }
];

describe('FactorList', () => {
  it('renders title', () => {
    render(<FactorList title="Positive Drivers" items={mockFactors} color="emerald" />);
    
    expect(screen.getByText('Positive Drivers')).toBeInTheDocument();
  });

  it('renders all factor items', () => {
    render(<FactorList title="Factors" items={mockFactors} color="emerald" />);
    
    expect(screen.getByText('RSI')).toBeInTheDocument();
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('Moving Average')).toBeInTheDocument();
  });

  it('displays SHAP values with 2 decimal places', () => {
    render(<FactorList title="Factors" items={mockFactors} color="emerald" />);
    
    expect(screen.getByText('0.50')).toBeInTheDocument();
    expect(screen.getByText('0.30')).toBeInTheDocument();
    expect(screen.getByText('0.20')).toBeInTheDocument();
  });

  it('applies emerald color styling', () => {
    const { container } = render(
      <FactorList title="Positive" items={mockFactors} color="emerald" />
    );
    
    const title = screen.getByText('Positive');
    expect(title.className).toContain('text-emerald-400');
  });

  it('applies rose color styling', () => {
    const { container } = render(
      <FactorList title="Negative" items={mockFactors} color="rose" />
    );
    
    const title = screen.getByText('Negative');
    expect(title.className).toContain('text-rose-400');
  });

  it('displays up arrow for emerald color', () => {
    render(<FactorList title="Positive" items={mockFactors} color="emerald" />);
    
    const arrows = screen.getAllByText('↑');
    expect(arrows.length).toBe(mockFactors.length);
  });

  it('displays down arrow for rose color', () => {
    render(<FactorList title="Negative" items={mockFactors} color="rose" />);
    
    const arrows = screen.getAllByText('↓');
    expect(arrows.length).toBe(mockFactors.length);
  });

  it('renders empty list when no items provided', () => {
    render(<FactorList title="Empty" items={[]} color="emerald" />);
    
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.queryByText('RSI')).not.toBeInTheDocument();
  });

  it('truncates long factor names', () => {
    const longNameFactor: Factor[] = [
      { name: 'Very Long Factor Name That Should Be Truncated', shap: 0.5 }
    ];
    
    const { container } = render(
      <FactorList title="Factors" items={longNameFactor} color="emerald" />
    );
    
    const factorName = container.querySelector('.truncate');
    expect(factorName).toBeInTheDocument();
  });

  it('has title attribute for factor names', () => {
    render(<FactorList title="Factors" items={mockFactors} color="emerald" />);
    
    const rsiElement = screen.getByText('RSI');
    expect(rsiElement).toHaveAttribute('title', 'RSI');
  });
});
