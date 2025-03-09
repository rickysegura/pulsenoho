// src/app/settings/page.js
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';

export default function Settings() {
  const { currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }

    const fetchUsername = async () => {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUsername(userSnap.data().username || '');
      }
      setLoading(false);
    };

    fetchUsername();
  }, [currentUser, router]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage('Username cannot be empty');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { username: username.trim() }, { merge: true });
      setMessage('Username saved successfully!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error saving username:', error);
      setMessage('Failed to save username');
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-center">Loading...</p>;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-white">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="bg-white/10 border-white/20 text-white w-full"
              />
            </div>
            <Button
              type="submit"
              className="bg-white/20 text-white hover:bg-white/30 w-full"
            >
              Save
            </Button>
            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
          </form>
          <Button
            onClick={() => router.push('/')}
            className="bg-gray-700 text-white hover:bg-gray-600 w-full"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}