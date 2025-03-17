'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { LogIn, Mail, Lock, Home, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function Login() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard'); // Redirect to dashboard if already logged in
    }
  }, [currentUser, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      toast.success('Logged in successfully!');
      router.push('/dashboard'); // Redirect to dashboard after successful login
    } catch (error) {
      console.error('Login failed:', error.message);
      
      // More user-friendly error messages
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        setError(error.message || 'An error occurred during login. Please try again.');
      }
      
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-6">
            <Image 
              src="/logo_blue.png" 
              alt="PulseNoHo Logo" 
              width={300} 
              height={100} 
              className="drop-shadow-md"
            />
          </div>
          <CardTitle className="text-2xl font-semibold text-white text-center">Welcome Back</CardTitle>
          <CardDescription className="text-gray-400 text-center">
            Log in to your PulseNoHo account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-md p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-300">Password</label>
                <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4 pt-2">
          <div className="text-center w-full border-t border-white/10 pt-4">
            <p className="text-gray-300 text-sm">
              Need an account?{' '}
              <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Sign Up
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