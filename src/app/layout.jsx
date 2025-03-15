// src/app/layout.js
import ClientLayout from './ClientLayout';
import './globals.css';

export const metadata = {
  title: "PulseNoHo",
  description: "Built by Ricky Segura",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}