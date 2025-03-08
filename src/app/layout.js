import "./globals.css";
import { AuthProvider } from '../contexts/AuthContext';

export const metadata = {
  title: "NoHo Live",
  description: "Built by Ricky Segura",
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
