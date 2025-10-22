import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TickerInput } from '../../src/components/TickerInput';

describe('TickerInput', () => {
  it('renders with default value', () => {
    render(
      <TickerInput
        value="AAPL"
        onChange={vi.fn()}
        onPredict={vi.fn()}
      />
    );
    
    expect(screen.getByLabelText(/select stock ticker/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('AAPL');
  });

  it('renders all available tickers in dropdown', () => {
    render(
      <TickerInput
        value="AAPL"
        onChange={vi.fn()}
        onPredict={vi.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));
    
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('AAPL');
    expect(options[1]).toHaveValue('AMZN');
    expect(options[2]).toHaveValue('MSFT');
  });

  it('calls onChange when ticker is selected', () => {
    const handleChange = vi.fn();
    render(
      <TickerInput
        value="AAPL"
        onChange={handleChange}
        onPredict={vi.fn()}
      />
    );
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'MSFT' } });
    
    expect(handleChange).toHaveBeenCalledWith('MSFT');
  });

  it('calls onPredict with ticker when Analyze button is clicked', () => {
    const handlePredict = vi.fn();
    render(
      <TickerInput
        value="AAPL"
        onChange={vi.fn()}
        onPredict={handlePredict}
      />
    );
    
    const button = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(button);
    
    expect(handlePredict).toHaveBeenCalledWith('AAPL');
  });

  it('disables select and button when disabled prop is true', () => {
    render(
      <TickerInput
        value="AAPL"
        onChange={vi.fn()}
        onPredict={vi.fn()}
        disabled={true}
      />
    );
    
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /analyze/i })).toBeDisabled();
  });

  it('displays error message when error prop is provided', () => {
    render(
      <TickerInput
        value="AAPL"
        onChange={vi.fn()}
        onPredict={vi.fn()}
        error="Invalid ticker symbol"
      />
    );
    
    expect(screen.getByText('Invalid ticker symbol')).toBeInTheDocument();
  });

  it('syncs local value with parent value prop', () => {
    const { rerender } = render(
      <TickerInput
        value="AAPL"
        onChange={vi.fn()}
        onPredict={vi.fn()}
      />
    );
    
    expect(screen.getByRole('combobox')).toHaveValue('AAPL');
    
    rerender(
      <TickerInput
        value="MSFT"
        onChange={vi.fn()}
        onPredict={vi.fn()}
      />
    );
    
    expect(screen.getByRole('combobox')).toHaveValue('MSFT');
  });

  it('calls both onChange and onPredict when Analyze is clicked', () => {
    const handleChange = vi.fn();
    const handlePredict = vi.fn();
    
    render(
      <TickerInput
        value="AAPL"
        onChange={handleChange}
        onPredict={handlePredict}
      />
    );
    
    const button = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(button);
    
    expect(handleChange).toHaveBeenCalledWith('AAPL');
    expect(handlePredict).toHaveBeenCalledWith('AAPL');
  });

  it('applies error styling when error is present', () => {
    render(
      <TickerInput
        value="AAPL"
        onChange={vi.fn()}
        onPredict={vi.fn()}
        error="Error message"
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select.className).toContain('border-red-500');
  });

  it('applies disabled styling when disabled', () => {
    render(
      <TickerInput
        value="AAPL"
        onChange={vi.fn()}
        onPredict={vi.fn()}
        disabled={true}
      />
    );
    
    const select = screen.getByRole('combobox');
    const button = screen.getByRole('button', { name: /analyze/i });
    
    expect(select.className).toContain('cursor-not-allowed');
    expect(button.className).toContain('cursor-not-allowed');
  });
});
