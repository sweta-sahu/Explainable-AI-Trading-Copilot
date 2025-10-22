import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders prediction-card variant', () => {
    const { container } = render(<SkeletonLoader variant="prediction-card" />);
    
    expect(container.querySelector('.rounded-2xl')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders evidence-panel variant', () => {
    const { container } = render(<SkeletonLoader variant="evidence-panel" />);
    
    expect(container.querySelector('.rounded-2xl')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders history-table variant', () => {
    const { container } = render(<SkeletonLoader variant="history-table" />);
    
    expect(container.querySelector('.rounded-2xl')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <SkeletonLoader variant="prediction-card" className="custom-class" />
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('prediction-card has header, content, and footer sections', () => {
    const { container } = render(<SkeletonLoader variant="prediction-card" />);
    
    const header = container.querySelector('header');
    const footer = container.querySelector('footer');
    
    expect(header).toBeInTheDocument();
    expect(footer).toBeInTheDocument();
  });

  it('evidence-panel renders multiple skeleton items', () => {
    const { container } = render(<SkeletonLoader variant="evidence-panel" />);
    
    const skeletonBoxes = container.querySelectorAll('.animate-pulse');
    expect(skeletonBoxes.length).toBeGreaterThan(5);
  });

  it('history-table renders table structure', () => {
    const { container } = render(<SkeletonLoader variant="history-table" />);
    
    const skeletonBoxes = container.querySelectorAll('.animate-pulse');
    // Should have header row + multiple data rows
    expect(skeletonBoxes.length).toBeGreaterThan(10);
  });

  it('all skeleton boxes have pulse animation', () => {
    const { container } = render(<SkeletonLoader variant="prediction-card" />);
    
    const skeletonBoxes = container.querySelectorAll('.animate-pulse');
    skeletonBoxes.forEach(box => {
      expect(box.className).toContain('animate-pulse');
      expect(box.className).toContain('bg-white/10');
    });
  });
});
