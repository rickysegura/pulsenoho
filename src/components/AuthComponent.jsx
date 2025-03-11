'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { LogOut, Mail, Lock, User, LogIn } from 'lucide-react';

export default function AuthComponent() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      toast.success('Logged in successfully');
    } catch (error) {
      console.error('Login failed:', error.message);
      let errorMessage = 'Login failed';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Try again later';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error.message);
      toast.error('Logout failed');
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-300 text-sm">
            Logged in as <span className="text-white font-medium">{currentUser.email}</span>
          </p>
          <Badge variant="outline" className="text-xs text-gray-300 border-gray-600">
            {currentUser.emailVerified ? 'Verified' : 'Unverified'}
          </Badge>
        </div>
        
        <div className="flex flex-col space-y-2">
          <Link href="/settings">
            <Button variant="outline" className="w-full justify-start text-gray-300 border-gray-700 hover:text-white hover:bg-white/10">
              <User className="h-4 w-4 mr-2" />
              Account Settings
            </Button>
          </Link>
          
          <Button 
            onClick={handleLogout} 
            variant="destructive" 
            className="w-full justify-start bg-red-900/50 hover:bg-red-900/70 text-white"
            disabled={loading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {loading ? 'Logging out...' : 'Log Out'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardContent className="p-4">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-400 block">Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-white/10 border-white/20 text-white pl-10"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm text-gray-400 block">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white/10 border-white/20 text-white pl-10"
                disabled={loading}
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={loading}
          >
            <LogIn className="h-4 w-4 mr-2" />
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center border-t border-white/10 pt-4">
          <p className="text-gray-300 text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
              Sign Up
            </Link>
          </p>
          
          <Link href="/forgot-password" className="text-gray-400 text-xs hover:text-gray-300 mt-2 inline-block">
            Forgot password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}