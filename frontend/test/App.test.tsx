import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';
import * as useApiDataModule from '../src/hooks/useApiData';
import * as useHistoryDataModule from '../src/hooks/useHistoryData';

// Mock the hooks
vi.mock('../src/hooks/useApiData');
vi.mock('../src/hooks/useHistoryData');

const mockUseApiData = {
    data: null,
    loading: 'idle' as const,
    error: null,
    isRefreshing: false,
    fetchData: vi.fn(),
    retry: vi.fn(),
    clearError: vi.fn()
};

const mockUseHistoryData = {
    data: [],
    loading: 'idle' as const,
    error: null,
    fetchHistory: vi.fn()
};

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(useApiDataModule, 'useApiData').mockReturnValue(mockUseApiData);
        vi.spyOn(useHistoryDataModule, 'useHistoryData').mockReturnValue(mockUseHistoryData);
    });

    it('renders app header', () => {
        render(<App />);

        expect(screen.getByText('AI Trading Copilot')).toBeInTheDocument();
    });

    it('renders ticker input', () => {
        render(<App />);

        expect(screen.getByLabelText(/select stock ticker/i)).toBeInTheDocument();
    });

    it('renders health badge', () => {
        render(<App />);

        expect(screen.getByText(/SYSTEMS OPERATIONAL|DEGRADED/)).toBeInTheDocument();
    });

    it('renders footer', () => {
        render(<App />);

        expect(screen.getByText(/Explainable AI Trading Copilot/)).toBeInTheDocument();
        expect(screen.getByText(/Not financial advice/)).toBeInTheDocument();
    });

    it('fetches initial data on mount', () => {
        render(<App />);

        expect(mockUseApiData.fetchData).toHaveBeenCalledWith('AAPL');
        expect(mockUseHistoryData.fetchHistory).toHaveBeenCalledWith('AAPL');
    });

    it('updates ticker when selection changes', () => {
        render(<App />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'MSFT' } });

        expect(select).toHaveValue('MSFT');
    });

    it('fetches data when Analyze button is clicked', () => {
        render(<App />);

        const button = screen.getByRole('button', { name: /analyze/i });
        fireEvent.click(button);

        expect(mockUseApiData.fetchData).toHaveBeenCalled();
        expect(mockUseHistoryData.fetchHistory).toHaveBeenCalled();
    });

    it('disables input when loading', () => {
        vi.spyOn(useApiDataModule, 'useApiData').mockReturnValue({
            ...mockUseApiData,
            loading: 'loading'
        });

        render(<App />);

        expect(screen.getByRole('combobox')).toBeDisabled();
        expect(screen.getByRole('button', { name: /analyze/i })).toBeDisabled();
    });

    it('shows loading spinner when refreshing', () => {
        vi.spyOn(useApiDataModule, 'useApiData').mockReturnValue({
            ...mockUseApiData,
            isRefreshing: true
        });

        render(<App />);

        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows skeleton loader when loading prediction', () => {
        vi.spyOn(useApiDataModule, 'useApiData').mockReturnValue({
            ...mockUseApiData,
            loading: 'loading'
        });

        const { container } = render(<App />);

        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows skeleton loader when loading history', () => {
        vi.spyOn(useHistoryDataModule, 'useHistoryData').mockReturnValue({
            ...mockUseHistoryData,
            loading: 'loading'
        });

        const { container } = render(<App />);

        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows error state for history', () => {
        vi.spyOn(useHistoryDataModule, 'useHistoryData').mockReturnValue({
            ...mockUseHistoryData,
            error: {
                message: 'Failed to load history',
                code: 'ERROR',
                type: 'api' as const
            }
        });

        render(<App />);

        expect(screen.getByText('Unable to Load History')).toBeInTheDocument();
        expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    });

    it('retries history fetch when Try Again is clicked', () => {
        vi.spyOn(useHistoryDataModule, 'useHistoryData').mockReturnValue({
            ...mockUseHistoryData,
            error: {
                message: 'Error',
                code: 'ERROR',
                type: 'api' as const
            }
        });

        render(<App />);

        const retryButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(retryButton);

        expect(mockUseHistoryData.fetchHistory).toHaveBeenCalled();
    });

    it('passes ticker to predict handler', () => {
        render(<App />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'AMZN' } });

        const button = screen.getByRole('button', { name: /analyze/i });
        fireEvent.click(button);

        expect(mockUseApiData.fetchData).toHaveBeenCalledWith('AMZN');
        expect(mockUseHistoryData.fetchHistory).toHaveBeenCalledWith('AMZN');
    });

    it('renders background ambient effects', () => {
        const { container } = render(<App />);

        const effects = container.querySelectorAll('.blur-\\[150px\\]');
        expect(effects.length).toBeGreaterThan(0);
    });

    it('wraps components in ErrorBoundary', () => {
        const { container } = render(<App />);

        // ErrorBoundary is a class component, check if components are rendered
        expect(screen.getByLabelText(/select stock ticker/i)).toBeInTheDocument();
    });
});
