import { ThemeProvider } from '@/components/theme-provider';
import { RutasApp } from './componentes/RutasApp.tsx';

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <RutasApp />
    </ThemeProvider>
  );
}
