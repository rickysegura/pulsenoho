// src/app/login/page.js
'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      router.push('/forum'); // Redirect to forum if already logged in
    }
  }, [currentUser, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      router.push('/forum'); // Redirect to forum after successful login
    } catch (error) {
      console.error('Login failed:', error.message);
      setError(error.message); // Display error to user
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-white">Log In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="flex flex-col space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-white/10 border-white/20 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-white/30"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-white/10 border-white/20 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-white/30"
              required
            />
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            <Button type="submit" className="bg-white/20 text-white hover:bg-white/30">
              Log In
            </Button>
          </form>
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