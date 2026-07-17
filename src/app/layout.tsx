import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'LinguaConnect — Practice Languages with Real People',
  description: 'Connect with native speakers worldwide through live video, chat, and language exchange.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navigation />
          <main className="min-h-screen pb-20 md:pb-0">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
