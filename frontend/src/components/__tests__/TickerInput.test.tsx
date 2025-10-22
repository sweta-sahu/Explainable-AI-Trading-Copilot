import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TickerInput } from '../TickerInput';

describe('TickerInput', () => {
  const defaultProps = {
    value: 'AAPL',
    onChange: vi.fn(),
    onPredict: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with initial value', () => {
    render(<TickerInput {...defaultProps} />);

    const input = screen.getByDisplayValue('AAPL');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
  });

  it('should convert input to uppercase', async () => {
    const user = userEvent.setup();
    render(<TickerInput {...defaultProps} value="" />);

    const input = screen.getByPlaceholderText('e.g., AAPL, GOOG, TSLA');
    await user.type(input, 'aapl');

    expect(input).toHaveValue('AAPL');
  });

  it('should call onPredict when analyze button is clicked', async () => {
    const user = userEvent.setup();
    render(<TickerInput {...defaultProps} />);

    const button = screen.getByText('Analyze');
    await user.click(button);

    expect(defaultProps.onPredict).toHaveBeenCalledTimes(1);
  });

  it('should call onPredict when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(<TickerInput {...defaultProps} />);

    const input = screen.getByDisplayValue('AAPL');
    await user.type(input, '{enter}');

    expect(defaultProps.onPredict).toHaveBeenCalledTimes(1);
  });

  it('should update onChange with trimmed value when analyze is clicked', async () => {
    const user = userEvent.setup();
    render(<TickerInput {...defaultProps} value="" />);

    const input = screen.getByPlaceholderText('e.g., AAPL, GOOG, TSLA');
    await user.type(input, '  GOOGL  ');

    const button = screen.getByText('Analyze');
    await user.click(button);

    expect(defaultProps.onChange).toHaveBeenCalledWith('GOOGL');
  });

  it('should fallback to AAPL when empty value is analyzed', async () => {
    const user = userEvent.setup();
    render(<TickerInput {...defaultProps} value="" />);

    const button = screen.getByText('Analyze');
    await user.click(button);

    expect(defaultProps.onChange).toHaveBeenCalledWith('AAPL');
  });

  it('should show error state', () => {
    render(<TickerInput {...defaultProps} error="Invalid ticker symbol" />);

    expect(screen.getByText('Invalid ticker symbol')).toBeInTheDocument();
    expect(screen.queryByText('Press')).not.toBeInTheDocument();
  });

  it('should show disabled state', () => {
    render(<TickerInput {...defaultProps} disabled />);

    const input = screen.getByDisplayValue('AAPL');
    const button = screen.getByText('Analyze');

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('should not call onPredict when Enter is pressed while disabled', async () => {
    const user = userEvent.setup();
    render(<TickerInput {...defaultProps} disabled />);

    const input = screen.getByDisplayValue('AAPL');
    await user.type(input, '{enter}');

    expect(defaultProps.onPredict).not.toHaveBeenCalled();
  });

  it('should apply error styling when error is present', () => {
    render(<TickerInput {...defaultProps} error="Test error" />);

    const input = screen.getByDisplayValue('AAPL');
    expect(input).toHaveClass('border-red-500/50');
  });

  it('should apply disabled styling when disabled', () => {
    render(<TickerInput {...defaultProps} disabled />);

    const input = screen.getByDisplayValue('AAPL');
    const button = screen.getByText('Analyze');

    expect(input).toHaveClass('cursor-not-allowed');
    expect(button).toHaveClass('cursor-not-allowed');
  });

  it('should show help text when no error is present', () => {
    render(<TickerInput {...defaultProps} />);

    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Press Enter to run';
    })).toBeInTheDocument();
  });
});