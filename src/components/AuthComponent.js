"use client";

import { useAuth } from '../contexts/AuthContext';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useState } from 'react';

export default function AuthComponent() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login failed:', error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (currentUser) {
    return <button onClick={handleLogout}>Log Out</button>;
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Log In</button>
    </form>
  );
}