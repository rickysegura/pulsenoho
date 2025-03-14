'use client';

import { Card } from './ui/card';

export default function Footer() {
  return (
    <footer className="w-full mx-auto mt-6 px-4">
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 rounded-lg p-4 text-center text-gray-300">
        <p className="text-sm">North Hollywood Live built by <a href="https://rickysegura.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 underline">Ricky Segura</a></p>
      </Card>
    </footer>
  );
}