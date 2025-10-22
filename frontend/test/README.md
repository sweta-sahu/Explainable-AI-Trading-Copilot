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
