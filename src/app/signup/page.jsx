// src/app/signup/page.js
'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUp() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      router.push('/forum'); // Redirect to forum if already signed in
    }
  }, [currentUser, router]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username: email.split('@')[0], // Default username from email
        email: email,
        points: 0,
        followers: [],
        following: [],
        isAdmin: false,
      });
      setEmail('');
      setPassword('');
      router.push('/forum'); // Redirect to forum after successful signup
    } catch (error) {
      console.error('Sign-up failed:', error.message);
      setError(error.message); // Display error to user
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-white">Sign Up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignUp} className="flex flex-col space-y-4">
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
              Sign Up
            </Button>
          </form>
          <p className="text-gray-300 text-sm text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-white underline hover:text-gray-200">
              Log In
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