// src/app/login/page.js
'use client';

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AuthComponent from '../../components/AuthComponent';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.push('/forum');
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-white">Log In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthComponent />
          <p className="text-gray-300 text-sm text-center">
            Need an account?{' '}
            <Link href="/signup" className="text-white underline hover:text-gray-200">
              Sign Up
            </Link>
          </p>
          <Button
            onClick={() => router.push('/')}
            className="w-full bg-gray-700 text-white hover:bg-gray-600"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}