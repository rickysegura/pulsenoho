'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft, User, Star, MapPin, RefreshCw } from 'lucide-react';
import Footer from '../../components/Footer';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export default function DiscoverPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterActive, setFilterActive] = useState('all'); // 'all', 'mostActive'
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [userFollowingMap, setUserFollowingMap] = useState({});
  const [followActionInProgress, setFollowActionInProgress] = useState(null);
  const router = useRouter();

  const USERS_PER_PAGE = 12;

  // Fetch current user data including following list
  const fetchCurrentUserData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        
        // Create a map of user IDs the current user is following
        const followingMap = {};
        if (data.following && Array.isArray(data.following)) {
          data.following.forEach(id => {
            followingMap[id] = true;
          });
        }
        setUserFollowingMap(followingMap);
      }
    } catch (error) {
      console.error('Error fetching current user data:', error);
    }
  }, [currentUser]);

  // Main function to fetch users
  const fetchUsers = useCallback(async (isInitialLoad = true) => {
    if (!currentUser) return;
    
    try {
      let usersQuery;
      
      // Different ordering based on filter
      switch (filterActive) {
        case 'mostActive':
          // Order by points (descending)
          usersQuery = query(
            collection(db, 'users'),
            orderBy('points', 'desc'),
            limit(USERS_PER_PAGE)
          );
          break;
          
        default:
          // Default ordering (recently joined)
          usersQuery = query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc'),
            limit(USERS_PER_PAGE)
          );
      }
      
      // If loading more (pagination), start after the last visible item
      if (!isInitialLoad && lastVisible) {
        usersQuery = query(
          usersQuery,
          startAfter(lastVisible)
        );
      }

      const usersSnapshot = await getDocs(usersQuery);
      
      // Update pagination state
      if (usersSnapshot.empty) {
        setHasMore(false);
      } else {
        // Store the last document for pagination
        setLastVisible(usersSnapshot.docs[usersSnapshot.docs.length - 1]);
        setHasMore(usersSnapshot.size >= USERS_PER_PAGE);
      }
      
      // Process user data, excluding current user
      const usersData = usersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data.username || 'Anonymous',
            bio: data.bio || '',
            photoURL: data.photoURL || '',
            points: data.points || 0,
            followersCount: data.followers?.length || 0,
            followingCount: data.following?.length || 0,
            favoriteVenueId: data.favoriteVenueId || null,
            favoriteVenueName: '',
            isFollowedByCurrentUser: userFollowingMap[doc.id] || false,
            createdAt: data.createdAt
          };
        })
        .filter(user => user.id !== currentUser.uid); // Exclude current user
      
      // Fetch favorite venue names if they exist
      const enhancedUsersData = await Promise.all(
        usersData.map(async (user) => {
          if (user.favoriteVenueId) {
            try {
              const venueRef = doc(db, 'venues', user.favoriteVenueId);
              const venueSnap = await getDoc(venueRef);
              if (venueSnap.exists()) {
                return {
                  ...user,
                  favoriteVenueName: venueSnap.data().name || 'Unknown Venue'
                };
              }
            } catch (error) {
              console.error("Error fetching venue:", error);
            }
          }
          return user;
        })
      );
      
      // Either set or append users based on whether this is initial load or pagination
      if (isInitialLoad) {
        setUsers(enhancedUsersData);
      } else {
        setUsers(prevUsers => [...prevUsers, ...enhancedUsersData]);
      }
      
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUser, filterActive, lastVisible, userFollowingMap, USERS_PER_PAGE]);

  // Handle filter changes
  const handleFilterChange = (filter) => {
    setFilterActive(filter);
    setLastVisible(null);
    setHasMore(true);
    setLoading(true);
  };

  // Load more users (pagination)
  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchUsers(false);
  };

  // Follow/unfollow a user
  const handleFollowToggle = async (e, userId, isCurrentlyFollowing) => {
    e.preventDefault(); // Prevent navigation to profile
    e.stopPropagation(); // Prevent event bubbling
    
    if (!currentUser || followActionInProgress === userId) return;
    
    setFollowActionInProgress(userId);
    
    try {
      // Update current user's following list
      const currentUserRef = doc(db, 'users', currentUser.uid);
      
      // Update target user's followers list
      const targetUserRef = doc(db, 'users', userId);
      
      if (isCurrentlyFollowing) {
        // Unfollow
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
        
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid)
        });
        
        // Update local state
        setUserFollowingMap(prev => {
          const updated = {...prev};
          delete updated[userId];
          return updated;
        });
        
        // Update users list display
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (user.id === userId) {
              return {
                ...user,
                isFollowedByCurrentUser: false,
                followersCount: Math.max(0, user.followersCount - 1)
              };
            }
            return user;
          })
        );
        
      } else {
        // Follow
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
        
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid)
        });
        
        // Update local state
        setUserFollowingMap(prev => ({
          ...prev,
          [userId]: true
        }));
        
        // Update users list display
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (user.id === userId) {
              return {
                ...user,
                isFollowedByCurrentUser: true,
                followersCount: user.followersCount + 1
              };
            }
            return user;
          })
        );
      }
      
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast.error('Failed to update follow status');
    } finally {
      setFollowActionInProgress(null);
    }
  };

  // Initialize data
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // First fetch current user data
    fetchCurrentUserData().then(() => {
      // Then fetch other users
      fetchUsers(true);
    });
    
    // Adding cleanup function
    return () => {
      setFollowActionInProgress(null);
    };
  }, [currentUser, router]);

  // Re-fetch users when filter changes
  useEffect(() => {
    if (currentUser) {
      setLastVisible(null);
      setUsers([]);
      setHasMore(true);
      setLoading(true);
      fetchUsers(true);
    }
  }, [filterActive, currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <p className="text-lg">Please log in to discover other users.</p>
        <Button 
          onClick={() => router.push('/login')} 
          className="mt-4 bg-indigo-600 hover:bg-indigo-700"
        >
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/dashboard" className="mr-3">
            <Button size="sm" className="h-9 w-9 p-0 bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Discover Users</h1>
        </div>
        
        {/* Filter Tabs */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm"
              className={filterActive === 'all' ? "bg-indigo-600 text-white" : "border-white/20 text-white bg-transparent"}
              onClick={() => handleFilterChange('all')}
            >
              <Users className="h-4 w-4 mr-1" /> Recently Joined
            </Button>
            <Button 
              size="sm"
              className={filterActive === 'mostActive' ? "bg-indigo-600 text-white" : "border-white/20 text-white bg-transparent"}
              onClick={() => handleFilterChange('mostActive')}
            >
              <Star className="h-4 w-4 mr-1" /> Most Active
            </Button>
          </div>
        </div>
        
        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {loading ? (
            // Loading skeletons
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-white/5 backdrop-blur-sm border-white/10 h-44 animate-pulse">
                <CardContent className="p-0"></CardContent>
              </Card>
            ))
          ) : users.length > 0 ? (
            // User cards
            users.map((user) => (
              <Card 
                key={user.id}
                className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors h-full"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* User Avatar (Link to profile) */}
                    <Link href={`/profile/${user.id}`} className="flex-shrink-0">
                      {user.photoURL ? (
                        <div className="w-16 h-16 relative rounded-lg overflow-hidden border border-white/20">
                          <Image 
                            src={user.photoURL} 
                            alt={user.username} 
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-indigo-800 rounded-lg flex items-center justify-center border border-white/20">
                          <span className="text-xl font-bold text-white">{user.username.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </Link>
                    
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <Link href={`/profile/${user.id}`} className="font-medium text-white hover:text-indigo-300">
                          {user.username}
                        </Link>
                        <Button
                          size="sm"
                          className={`text-xs h-7 ${user.isFollowedByCurrentUser ? 'bg-indigo-600 text-white' : 'border-white/20 text-white bg-transparent'}`}
                          onClick={(e) => handleFollowToggle(e, user.id, user.isFollowedByCurrentUser)}
                          disabled={followActionInProgress === user.id}
                        >
                          {followActionInProgress === user.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : user.isFollowedByCurrentUser ? (
                            'Following'
                          ) : (
                            'Follow'
                          )}
                        </Button>
                      </div>
                      
                      <div className="flex gap-4 text-xs text-gray-400 mt-1">
                        <span>{user.followersCount} {user.followersCount === 1 ? 'follower' : 'followers'}</span>
                        <span>{user.points} points</span>
                      </div>
                      
                      {user.bio && (
                        <p className="text-gray-300 text-sm mt-2 line-clamp-2">{user.bio}</p>
                      )}
                      
                      {user.favoriteVenueName && (
                        <div className="mt-2 flex items-center">
                          <Link 
                            href={`/venues/${user.favoriteVenueId}`} 
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="h-3 w-3 mr-1" /> 
                            {user.favoriteVenueName}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // No users found
            <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-lg bg-white/5">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-300 mb-2">No users found</p>
              <p className="text-gray-500 text-sm">Try a different filter</p>
            </div>
          )}
        </div>
        
        {/* Load More Button */}
        {!loading && users.length > 0 && hasMore && (
          <div className="flex justify-center mt-4 mb-8">
            <Button 
              onClick={handleLoadMore} 
              disabled={loadingMore}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>Load More Users</>
              )}
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}