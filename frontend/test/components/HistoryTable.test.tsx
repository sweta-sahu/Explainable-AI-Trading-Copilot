import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryTable } from '../../src/components/HistoryTable';
import type { HistoryRow } from '../../src/types';

const mockHistory: HistoryRow[] = [
  {
    date: '2024-01-15',
    direction: 'UP',
    probability: 0.75,
    outcome: 'CORRECT'
  },
  {
    date: '2024-01-14',
    direction: 'DOWN',
    probability: 0.65,
    outcome: 'INCORRECT'
  },
  {
    date: '2024-01-13',
    direction: 'UP',
    probability: 0.80,
    outcome: null
  }
];

describe('HistoryTable', () => {
  it('renders table with header', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    expect(screen.getByText('Prediction History')).toBeInTheDocument();
    expect(screen.getByText('Recent trading day predictions')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Probability')).toBeInTheDocument();
    expect(screen.getByText('Outcome')).toBeInTheDocument();
  });

  it('renders all history rows', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    expect(screen.getByText('2024-01-14')).toBeInTheDocument();
    expect(screen.getByText('2024-01-13')).toBeInTheDocument();
  });

  it('displays UP direction with correct styling', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    // Check that UP directions exist in the table
    const tableBody = document.querySelector('tbody');
    expect(tableBody?.textContent).toContain('UP');
    expect(tableBody?.textContent).toContain('▲');
  });

  it('displays DOWN direction with correct styling', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    // Check that DOWN directions exist in the table
    const tableBody = document.querySelector('tbody');
    expect(tableBody?.textContent).toContain('DOWN');
    expect(tableBody?.textContent).toContain('▼');
  });

  it('formats probability as percentage', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('displays CORRECT outcome with green styling', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    // Check that CORRECT outcomes exist in the table
    const tableBody = document.querySelector('tbody');
    expect(tableBody?.textContent).toContain('CORRECT');
    expect(tableBody?.textContent).toContain('✓');
  });

  it('displays INCORRECT outcome with red styling', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    // Check that INCORRECT outcomes exist in the table
    const tableBody = document.querySelector('tbody');
    expect(tableBody?.textContent).toContain('INCORRECT');
    expect(tableBody?.textContent).toContain('✕');
  });

  it('displays PENDING for null outcome', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    expect(screen.getByText('— PENDING —')).toBeInTheDocument();
  });

  it('renders empty table when no rows provided', () => {
    render(<HistoryTable rows={[]} />);
    
    expect(screen.getByText('Prediction History')).toBeInTheDocument();
    expect(screen.queryByRole('row')).toBeInTheDocument(); // Header row exists
  });

  it('displays direction arrows', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    const upElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('▲') || false;
    });
    const downElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('▼') || false;
    });
    
    expect(upElements.length).toBeGreaterThan(0);
    expect(downElements.length).toBeGreaterThan(0);
  });

  it('displays outcome checkmarks and crosses', () => {
    render(<HistoryTable rows={mockHistory} />);
    
    const correctBadges = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('CORRECT') || false;
    });
    const incorrectBadges = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('INCORRECT') || false;
    });
    
    expect(correctBadges.length).toBeGreaterThan(0);
    expect(incorrectBadges.length).toBeGreaterThan(0);
  });
});
