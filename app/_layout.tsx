import { Stack } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WalletProvider } from '@/contexts/WalletContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </WalletProvider>
    </ThemeProvider>
  );
}
