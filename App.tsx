import React from 'react';
import { AuthScreen } from './src/screens/AuthScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthScreen />
    </ErrorBoundary>
  );
}


