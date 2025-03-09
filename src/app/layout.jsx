// src/app/layout.js
import ClientLayout from './ClientLayout';
import './globals.css';

export const metadata = {
  title: "North Hollywood Live",
  description: "Built by Ricky Segura",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}