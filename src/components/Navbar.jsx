'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  MapPin, 
  Users, 
  Shield, 
  Menu, 
  X, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const { currentUser, signout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState({
    points: 0,
    username: '',
    photoURL: '',
    isAdmin: false
  });
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      // Check if click is outside the dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    // Only add listener when dropdown is open
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Load user data
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    async function loadUserData() {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData({
            points: data.points || 0,
            username: data.username || currentUser.email?.split('@')[0] || 'User',
            photoURL: data.photoURL || '',
            isAdmin: !!data.isAdmin
          });
        } else {
          setUserData({
            points: 0,
            username: currentUser.email?.split('@')[0] || 'User',
            photoURL: '',
            isAdmin: false
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadUserData();
  }, [currentUser]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Separated logout function that's more robust
  const handleLogout = async (event) => {
    // Prevent event bubbling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    try {
      // Close menu
      setIsOpen(false);
      
      // Small timeout to prevent state updates on unmounted components
      setTimeout(async () => {
        // Sign out
        await signout();
        // Navigate to login page
        router.push('/login');
      }, 50);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-gray-800 border-b border-white/10 py-3 px-4 sticky top-0 z-20">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center z-10">
          <Image 
            src="/logo_blue.png" 
            alt="PulseNoHo Logo" 
            width={125}
            height={50}
            priority
          />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/venues">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <MapPin className="h-4 w-4 mr-1" /> Venues
            </Button>
          </Link>
          
          <Link href="/forum">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <Users className="h-4 w-4 mr-1" /> Forum
            </Button>
          </Link>
          
          <Link href="/discover">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <Users className="h-4 w-4 mr-1" /> Discover
            </Button>
          </Link>
          
          {userData.isAdmin && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Shield className="h-4 w-4 mr-1" /> Admin
              </Button>
            </Link>
          )}
          
          <Link href="/messages">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 relative">
              <MessageSquare className="h-4 w-4 mr-1" /> Messages
            </Button>
          </Link>
          
          {/* User Profile Button & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={toggleMenu} 
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors rounded-full px-2 py-1"
            >
              <Badge className="bg-indigo-600 text-white">{userData.points} pts</Badge>
              {userData.photoURL ? (
                <Image
                  src={userData.photoURL}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full border border-white/20"
                />
              ) : (
                <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {userData.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </button>
            
            {/* Desktop Dropdown Menu */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-white/10 overflow-hidden z-30">
                <div className="p-3 border-b border-white/10">
                  <p className="text-white font-medium">{userData.username}</p>
                  <p className="text-gray-400 text-sm">{userData.points} points</p>
                </div>
                <div className="py-1">
                  <Link href={`/profile/${currentUser?.uid}`} onClick={() => setIsOpen(false)}>
                    <div className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/10 cursor-pointer">
                      <User className="h-4 w-4 mr-2" /> Profile
                    </div>
                  </Link>
                  <Link href="/settings" onClick={() => setIsOpen(false)}>
                    <div className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/10 cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" /> Settings
                    </div>
                  </Link>
                  {/* Direct button, not wrapped in a Link */}
                  <div 
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Log Out
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Hamburger & User Info */}
        <div className="md:hidden flex items-center gap-2">
          <Badge className="bg-indigo-600 text-white">{userData.points} pts</Badge>
          
          {/* Hamburger Button */}
          <button 
            onClick={toggleMenu}
            className="p-1 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Mobile Menu Overlay */}
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 z-10 transition-opacity duration-200 md:hidden ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Mobile Slide-in Menu */}
        <div 
          ref={mobileMenuRef}
          className={`fixed top-0 right-0 h-full w-64 bg-gray-800 z-20 transform transition-transform duration-300 ease-in-out md:hidden ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-5 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {userData.photoURL ? (
                <Image
                  src={userData.photoURL}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="rounded-full border border-white/20"
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium">
                    {userData.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="text-white font-medium">{userData.username}</p>
                <p className="text-gray-400 text-sm">{userData.points} points</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="py-4 px-2 space-y-1">
            <Link href="/" onClick={() => setIsOpen(false)}>
              <div className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-white/10">
                <MapPin className="h-5 w-5 mr-3" /> Home
              </div>
            </Link>
            
            <Link href="/venues" onClick={() => setIsOpen(false)}>
              <div className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-white/10">
                <MapPin className="h-5 w-5 mr-3" /> Venues
              </div>
            </Link>
            
            <Link href="/forum" onClick={() => setIsOpen(false)}>
              <div className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-white/10">
                <Users className="h-5 w-5 mr-3" /> Forum
              </div>
            </Link>
            
            <Link href="/discover" onClick={() => setIsOpen(false)}>
              <div className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-white/10">
                <Users className="h-5 w-5 mr-3" /> Discover
              </div>
            </Link>
            
            <Link href="/messages" onClick={() => setIsOpen(false)}>
              <div className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-white/10">
                <MessageSquare className="h-5 w-5 mr-3" /> Messages
              </div>
            </Link>
            
            <Link href={`/profile/${currentUser?.uid}`} onClick={() => setIsOpen(false)}>
              <div className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-white/10">
                <User className="h-5 w-5 mr-3" /> Profile
              </div>
            </Link>
            
            <Link href="/settings" onClick={() => setIsOpen(false)}>
              <div className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-white/10">
                <Settings className="h-5 w-5 mr-3" /> Settings
              </div>
            </Link>
            
            {userData.isAdmin && (
              <Link href="/admin" onClick={() => setIsOpen(false)}>
                <div className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-white/10">
                  <Shield className="h-5 w-5 mr-3" /> Admin
                </div>
              </Link>
            )}
            
            <div className="pt-4 mt-4 border-t border-gray-700">
              {/* Direct div for logout, not a button */}
              <div 
                onClick={handleLogout}
                className="flex w-full items-center px-3 py-2 rounded-md text-red-400 hover:bg-red-900/20 cursor-pointer"
              >
                <LogOut className="h-5 w-5 mr-3" /> Log Out
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}