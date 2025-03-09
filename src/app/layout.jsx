// src/app/layout.js
import ClientLayout from './ClientLayout';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata = {
  title: "North Hollywood Live",
  description: "Built by Ricky Segura",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body>
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}