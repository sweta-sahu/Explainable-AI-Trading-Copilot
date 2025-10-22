import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthBadge } from '../../src/components/HealthBadge';
import type { Health } from '../../src/types';

describe('HealthBadge', () => {
  it('displays SYSTEMS OPERATIONAL when all systems are healthy', () => {
    const healthyStatus: Health = {
      api: 'up',
      model: 'hot',
      data: 'fresh'
    };
    
    render(<HealthBadge status={healthyStatus} />);
    
    expect(screen.getByText('SYSTEMS OPERATIONAL')).toBeInTheDocument();
  });

  it('displays DEGRADED when api is down', () => {
    const degradedStatus: Health = {
      api: 'down',
      model: 'hot',
      data: 'fresh'
    };
    
    render(<HealthBadge status={degradedStatus} />);
    
    expect(screen.getByText('DEGRADED')).toBeInTheDocument();
  });

  it('displays DEGRADED when model is cold', () => {
    const degradedStatus: Health = {
      api: 'up',
      model: 'cold',
      data: 'fresh'
    };
    
    render(<HealthBadge status={degradedStatus} />);
    
    expect(screen.getByText('DEGRADED')).toBeInTheDocument();
  });

  it('displays DEGRADED when data is stale', () => {
    const degradedStatus: Health = {
      api: 'up',
      model: 'hot',
      data: 'stale'
    };
    
    render(<HealthBadge status={degradedStatus} />);
    
    expect(screen.getByText('DEGRADED')).toBeInTheDocument();
  });

  it('shows green indicator for healthy systems', () => {
    const healthyStatus: Health = {
      api: 'up',
      model: 'hot',
      data: 'fresh'
    };
    
    const { container } = render(<HealthBadge status={healthyStatus} />);
    
    const indicator = container.querySelector('.bg-emerald-500');
    expect(indicator).toBeInTheDocument();
  });

  it('shows amber indicator for degraded systems', () => {
    const degradedStatus: Health = {
      api: 'down',
      model: 'hot',
      data: 'fresh'
    };
    
    const { container } = render(<HealthBadge status={degradedStatus} />);
    
    const indicator = container.querySelector('.bg-amber-500');
    expect(indicator).toBeInTheDocument();
  });

  it('shows ping animation for healthy systems', () => {
    const healthyStatus: Health = {
      api: 'up',
      model: 'hot',
      data: 'fresh'
    };
    
    const { container } = render(<HealthBadge status={healthyStatus} />);
    
    const pingElement = container.querySelector('.animate-ping');
    expect(pingElement).toBeInTheDocument();
  });

  it('does not show ping animation for degraded systems', () => {
    const degradedStatus: Health = {
      api: 'down',
      model: 'hot',
      data: 'fresh'
    };
    
    const { container } = render(<HealthBadge status={degradedStatus} />);
    
    const pingElement = container.querySelector('.animate-ping');
    expect(pingElement).not.toBeInTheDocument();
  });
});
