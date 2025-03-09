// src/components/Footer.js
'use client';

import { Card } from './ui/card';

export default function Footer() {
  return (
    <footer className="w-full mx-auto mt-6">
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 rounded-lg p-4 text-center text-gray-300">
        <p className="text-sm">
          Built by Ricky Segura with{' '}
          <a
            href="https://xai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-gray-200 underline"
          >
            Grok
          </a>
          {' '}— Powered by{' '}
          <a
            href="https://firebase.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-gray-200 underline"
          >
            Firebase
          </a>
          {' '}and{' '}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-gray-200 underline"
          >
            Vercel
          </a>
        </p>
      </Card>
    </footer>
  );
}