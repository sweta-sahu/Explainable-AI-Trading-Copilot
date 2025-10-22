# Frontend Test Suite

This directory contains comprehensive tests for the AI Trading Copilot frontend application.

## Test Structure

```
test/
├── components/          # Component tests
│   ├── TickerInput.test.tsx
│   ├── PredictionCard.test.tsx
│   ├── EvidencePanel.test.tsx
│   ├── HistoryTable.test.tsx
│   ├── HealthBadge.test.tsx
│   ├── LoadingSpinner.test.tsx
│   ├── SkeletonLoader.test.tsx
│   ├── ErrorBoundary.test.tsx
│   ├── InfoPill.test.tsx
│   └── FactorList.test.tsx
├── hooks/               # Custom hooks tests
│   ├── useApiData.test.ts
│   └── useHistoryData.test.ts
├── services/            # API service tests
│   └── predictionApi.test.ts
├── utils/               # Utility function tests
│   └── errorHandling.test.ts
├── App.test.tsx         # Main app component test
└── setup.ts             # Test setup and configuration
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run specific test file
```bash
npm test -- TickerInput.test.tsx
```

### Run tests matching a pattern
```bash
npm test -- --grep="PredictionCard"
```

## Test Coverage

The test suite provides comprehensive coverage of:

- ✅ All React components
- ✅ Custom hooks (useApiData, useHistoryData)
- ✅ API services and data transformations
- ✅ Error handling utilities
- ✅ Loading and error states
- ✅ User interactions and event handling
- ✅ Data validation and formatting

## Testing Tools

- **Vitest**: Fast unit test framework
- **@testing-library/react**: React component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **happy-dom**: Lightweight DOM implementation for tests

## Writing Tests

### Component Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../../src/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from '../../src/hooks/useMyHook';

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.data).toBeNull();
  });

  it('fetches data successfully', async () => {
    const { result } = renderHook(() => useMyHook());
    
    result.current.fetchData();
    
    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });
  });
});
```

## Test Best Practices

1. **Descriptive test names**: Use clear, descriptive names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
3. **Test user behavior**: Focus on testing how users interact with components
4. **Mock external dependencies**: Use vi.mock() for API calls and external services
5. **Test edge cases**: Include tests for error states, loading states, and boundary conditions
6. **Keep tests isolated**: Each test should be independent and not rely on other tests
7. **Use data-testid sparingly**: Prefer semantic queries (getByRole, getByLabelText) over test IDs

## Continuous Integration

Tests are automatically run on:
- Pre-commit hooks
- Pull request creation
- Main branch merges

## Troubleshooting

### Tests failing locally but passing in CI
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vitest cache: `npx vitest --clearCache`

### Slow test execution
- Run tests in parallel: `npm test -- --threads`
- Use --bail flag to stop on first failure: `npm test -- --bail`

### Mock not working
- Ensure mocks are defined before imports
- Use vi.clearAllMocks() in beforeEach hooks
- Check mock implementation matches actual API

## Coverage Goals

Target coverage metrics:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure all tests pass before committing
3. Maintain or improve coverage metrics
4. Update this README if adding new test patterns
