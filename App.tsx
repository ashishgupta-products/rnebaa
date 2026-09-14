import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen } from './src/screens/AuthScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <AuthScreen />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}


