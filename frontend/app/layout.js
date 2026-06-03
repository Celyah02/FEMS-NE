import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'TZW FEMS — Fire Extinguisher Management',
  description: 'Fire Extinguisher Management System for TZW LTD',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
