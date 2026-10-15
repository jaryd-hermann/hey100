import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { captureEvent } from '@/lib/analytics';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Outermost provider so a failure while initialising providers still renders a
 * screen. The stack is shown in development only.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[error-boundary]', error, info.componentStack);
    captureEvent('app_crash', {
      message: error.message,
      stack: __DEV__ ? error.stack : undefined,
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: '#0E100F', padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: '#E8ECE7', fontSize: 22, fontWeight: '700', marginBottom: 10 }}>
          Something broke
        </Text>
        <Text style={{ color: '#8E968F', fontSize: 15, lineHeight: 22, marginBottom: 22 }}>
          Hey100 hit an unexpected error. Try again, and if it keeps happening let us know in the
          Hey100 Team chat.
        </Text>

        <Pressable
          onPress={this.reset}
          style={{
            backgroundColor: '#E8ECE7',
            paddingVertical: 15,
            borderRadius: 999,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#0E100F', fontSize: 15, fontWeight: '600' }}>Try again</Text>
        </Pressable>

        {__DEV__ ? (
          <ScrollView style={{ maxHeight: 220, marginTop: 24 }}>
            <Text style={{ color: '#8E968F', fontSize: 12, fontFamily: 'Menlo' }}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </Text>
          </ScrollView>
        ) : null}
      </View>
    );
  }
}
