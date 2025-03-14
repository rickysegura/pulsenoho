'use client';

import { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Heatmap from '../../components/Heatmap';
import AuthComponent from '../../components/AuthComponent';
import Footer from '../../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { MapContext } from '../ClientLayout';
import { MapPin, List, User, Users, ArrowRight, Clock, Star, Shield, LogOut, Menu, X } from 'lucide-react';
import { addSnapshot, removeSnapshot } from '../../lib/snapshotManager';

export default function Dashboard() {
  const router = useRouter();
  const { isMapLoaded } = useContext(MapContext);
  const [venueCount, setVenueCount] = useState(0);
  const { currentUser, loading: authLoading } = useAuth();
  const [showMap, setShowMap] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // User profile state
  const [userData, setUserData] = useState({
    points: 0,
    username: '',
    photoURL: '',
    bio: '',
    favoriteVenueId: '',
    favoriteVenueName: '',
    followers: [],
    following: [],
    isAdmin: false
  });
  const [profileLoading, setProfileLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  // Only show map when Google Maps is loaded and auth state is determined
  useEffect(() => {
    if (isMapLoaded && !authLoading && currentUser) {
      setShowMap(true);
    }
  }, [isMapLoaded, authLoading, currentUser]);

  // Load user profile data
  useEffect(() => {
    if (!currentUser) {
      setProfileLoading(false);
      return;
    }
    
    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(
      userRef, 
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Start with data from document
          const newUserData = {
            points: data.points || 0,
            username: data.username || currentUser.email?.split('@')[0] || 'User',
            photoURL: data.photoURL || '',
            bio: data.bio || '',
            favoriteVenueId: data.favoriteVenueId || '',
            followers: data.followers || [],
            following: data.following || [],
            isAdmin: !!data.isAdmin,
            favoriteVenueName: ''
          };

          // Fetch favorite venue name if ID exists
          if (data.favoriteVenueId) {
            try {
              const venueRef = doc(db, 'venues', data.favoriteVenueId);
              const venueSnap = await getDoc(venueRef);
              if (venueSnap.exists()) {
                newUserData.favoriteVenueName = venueSnap.data().name || 'Unknown Venue';
              }
            } catch (error) {
              console.error("Error fetching venue:", error);
            }
          }
          
          setUserData(newUserData);
        } else {
          // Reset to defaults if document doesn't exist
          setUserData({
            points: 0,
            username: currentUser.email?.split('@')[0] || 'User',
            photoURL: '',
            bio: '',
            favoriteVenueId: '',
            favoriteVenueName: '',
            followers: [],
            following: [],
            isAdmin: false
          });
        }
        
        setProfileLoading(false);
      },
      (error) => {
        console.error('Error in UserProfile snapshot:', error);
        setProfileLoading(false);
      }
    );

    // Register with snapshot manager instead of manually cleaning up
    addSnapshot(unsubscribe);
    
    // No need for explicit cleanup as the snapshot manager handles this
  }, [currentUser]);

  const handleVenueCountChange = (count) => {
    setVenueCount(count);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-gray-800 border-b border-white/10 py-3 px-4 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white flex items-center">
            NoHo Live 🚦
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
            
            {userData.isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </Button>
              </Link>
            )}
            
            <div className="flex items-center">
              <Badge className="bg-indigo-600 text-white mr-2">{userData.points} pts</Badge>
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
            </div>
          </div>
          
          {/* Mobile user info - always visible */}
          <div className="md:hidden flex items-center">
            <Badge className="bg-indigo-600 text-white mr-2">{userData.points} pts</Badge>
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
          </div>
        </div>
      </nav>
      
      {/* Hero Section with Heatmap */}
      <div className="relative w-full px-4 mt-4">
        {showMap ? (
          <div className="relative w-full py-6">
            <div className="w-full h-64 bg-gradient-to-b from-indigo-900 to-gray-900 rounded-lg flex items-center justify-center border border-white/10">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-white">View Live Venue Map</h2>
                <p className="text-gray-400 mt-2">See real-time busyness levels across North Hollywood</p>
                <Link href="/map">
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                    <MapPin className="h-4 w-4 mr-2" /> Open Map
                  </Button>
                </Link>
              </div>
            </div>
        </div>
        ) : (
          <div className="w-full h-96 bg-gradient-to-b from-indigo-900 to-gray-900 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse">
                <h2 className="text-xl font-semibold text-white/80">Loading map...</h2>
                <p className="text-gray-400">Please wait while we fetch venue data</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="w-full mx-auto flex flex-col md:flex-row gap-6 px-4 mt-3 md:mt-6">
        <main className="flex-1">          
          {/* Quick Actions */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                {/* Show these only on desktop since they're already in mobile bottom nav */}
                <div className="hidden md:block w-full">
                  <Link href="/venues" className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white h-auto py-3"
                    >
                      <div className="flex flex-col items-center">
                        <MapPin className="h-5 w-5 mb-1" />
                        <span className="text-sm">Browse All Venues</span>
                      </div>
                    </Button>
                  </Link>
                </div>
                <div className="hidden md:block w-full">
                  <Link href="/forum" className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white h-auto py-3"
                    >
                      <div className="flex flex-col items-center">
                        <Users className="h-5 w-5 mb-1" />
                        <span className="text-sm">Community Forum</span>
                      </div>
                    </Button>
                  </Link>
                </div>
                
                {/* Show these on both mobile and desktop */}
                <Link href="/messages" className="w-full">
                  <Button 
                    variant="outline" 
                    className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white h-auto py-3"
                  >
                    <div className="flex flex-col items-center">
                      <ArrowRight className="h-5 w-5 mb-1" />
                      <span className="text-sm">Messages</span>
                    </div>
                  </Button>
                </Link>
                <Link href="/settings" className="w-full">
                  <Button 
                    variant="outline" 
                    className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white h-auto py-3"
                  >
                    <div className="flex flex-col items-center">
                      <User className="h-5 w-5 mb-1" />
                      <span className="text-sm">Account Settings</span>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        
        <aside className="w-full md:w-80 flex flex-col gap-6">
          {/* Profile Card - Hide on mobile since we have mobile menu */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hidden md:block">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <div className="h-20 bg-white/5 animate-pulse rounded-lg"></div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {userData.photoURL ? (
                      <Image
                        src={userData.photoURL}
                        alt={`${userData.username}'s avatar`}
                        width={60}
                        height={60}
                        className="rounded-full border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-indigo-700 rounded-full flex items-center justify-center">
                        <span className="text-xl font-medium">
                          {userData.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-medium text-lg">{userData.username}</h3>
                      <div className="flex items-center">
                        <Badge className="bg-indigo-600 text-white">
                          {userData.points} points
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {userData.bio && (
                    <p className="text-gray-300 text-sm italic">"{userData.bio}"</p>
                  )}
                  
                  {userData.favoriteVenueName && (
                    <p className="text-gray-300 text-sm">
                      Favorite Spot: <span className="text-white">{userData.favoriteVenueName}</span>
                    </p>
                  )}
                  
                  <p className="text-gray-300 text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Followers: <span className="text-white">{userData.followers.length}</span> | Following: <span className="text-white">{userData.following.length}</span></span>
                  </p>
                  
                  <div className="pt-2 space-y-2">
                    <Link href={`/profile/${currentUser.uid}`}>
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white"
                      >
                        View Full Profile
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Additional Info Card */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">
                More
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuthComponent />
              
              <div className="mt-6 pt-4 border-t border-white/10">
                <h3 className="text-sm font-medium text-white mb-3">Navigation</h3>
                <div className="flex flex-col space-y-2">
                  {/* On desktop, show all links */}
                  <div className="hidden md:block">
                    <Link href="/venues" className="text-gray-300 hover:text-white text-sm flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-indigo-400" />
                      All Venues
                    </Link>
                  </div>
                  <div className="hidden md:block">
                    <Link href="/forum" className="text-gray-300 hover:text-white text-sm flex items-center">
                      <Users className="h-4 w-4 mr-2 text-indigo-400" />
                      Community Forum
                    </Link>
                  </div>
                  
                  {/* Show on both mobile and desktop */}
                  <Link href="/messages" className="text-gray-300 hover:text-white text-sm flex items-center">
                    <ArrowRight className="h-4 w-4 mr-2 text-indigo-400" />
                    Messages
                  </Link>
                  <Link href="/settings" className="text-gray-300 hover:text-white text-sm flex items-center">
                    <ArrowRight className="h-4 w-4 mr-2 text-indigo-400" />
                    Account Settings
                  </Link>
                  {userData.isAdmin && (
                    <Link href="/admin" className="text-gray-300 hover:text-white text-sm flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-indigo-400" />
                      Admin Dashboard
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-white/10 z-50">
        <div className="grid grid-cols-4 py-2">
          <Link href="/" className="flex flex-col items-center justify-center">
            <div className="p-1 text-white">
              <MapPin className="h-5 w-5 mx-auto" />
              <span className="text-xs mt-1 block">Home</span>
            </div>
          </Link>
          
          <Link href="/venues" className="flex flex-col items-center justify-center">
            <div className="p-1 text-white">
              <List className="h-5 w-5 mx-auto" />
              <span className="text-xs mt-1 block">Venues</span>
            </div>
          </Link>
          
          <Link href="/forum" className="flex flex-col items-center justify-center">
            <div className="p-1 text-white">
              <Users className="h-5 w-5 mx-auto" />
              <span className="text-xs mt-1 block">Forum</span>
            </div>
          </Link>
          
          <Link href={`/profile/${currentUser.uid}`} className="flex flex-col items-center justify-center">
            <div className="p-1 text-white">
              <User className="h-5 w-5 mx-auto" />
              <span className="text-xs mt-1 block">Profile</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer - Hide on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      {/* Add padding to account for fixed bottom navigation */}
      <div className="md:hidden h-16"></div>
    </div>
  );
}