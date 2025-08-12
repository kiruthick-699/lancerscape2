import { Stack } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WalletProvider } from '@/contexts/WalletContext';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthWrapper from '@/components/AuthWrapper';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WalletProvider>
          <AuthWrapper>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
            </Stack>
          </AuthWrapper>
        </WalletProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
