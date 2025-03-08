// src/components/AuthComponent.js
'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

export default function AuthComponent() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Login failed:', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  if (currentUser) {
    return (
      <Button onClick={handleLogout} className="bg-white/20 text-white hover:bg-white/30">
        Log Out
      </Button>
    );
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col space-y-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="bg-white/10 border-white/20 text-white p-2 rounded"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="bg-white/10 border-white/20 text-white p-2 rounded"
      />
      <Button type="submit" className="bg-white/20 text-white hover:bg-white/30">
        Log In
      </Button>
    </form>
  );
}