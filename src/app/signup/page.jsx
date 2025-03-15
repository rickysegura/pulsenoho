'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { UserPlus, Mail, Lock, Home, AlertCircle, User } from 'lucide-react';

export default function SignUp() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard'); // Redirect to dashboard if already signed in
    }
  }, [currentUser, router]);

  // Auto-generate username from email
  useEffect(() => {
    if (email && !username) {
      const autoUsername = email.split('@')[0];
      setUsername(autoUsername);
    }
  }, [email, username]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Basic validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username: username || email.split('@')[0], // Use entered username or default from email
        email: email,
        points: 0,
        followers: [],
        following: [],
        isAdmin: false,
        createdAt: new Date().toISOString()
      });
      
      setEmail('');
      setPassword('');
      setUsername('');
      
      toast.success('Account created successfully!');
      router.push('/dashboard'); // Redirect to dashboard after successful signup
    } catch (error) {
      console.error('Sign-up failed:', error.message);
      
      // More user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Try logging in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(error.message || 'An error occurred during sign up. Please try again.');
      }
      
      toast.error('Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-white text-center">Create Account</CardTitle>
          <CardDescription className="text-gray-400 text-center">
            Join PulseNoHo to start checking venue vibes
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-md p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300 block">Email</label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-white/10 border-white/20 text-white pl-10 focus:border-indigo-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-300 block">Username</label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="bg-white/10 border-white/20 text-white pl-10 focus:border-indigo-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {!username ? "We'll create one from your email" : ""}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-300 block">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min. 6 characters)"
                  className="bg-white/10 border-white/20 text-white pl-10 focus:border-indigo-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={loading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4 pt-2">
          <div className="text-center w-full border-t border-white/10 pt-4">
            <p className="text-gray-300 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Log In
              </Link>
            </p>
          </div>
          
          <Button
            onClick={() => router.push('/')}
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}