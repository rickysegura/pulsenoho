'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, Users, UserX } from 'lucide-react';

export default function UserFollowing() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userId } = useParams();

  // Check if viewing own following list
  const isOwnProfile = currentUser && userId === currentUser.uid;

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setProfile({
            id: userId,
            username: userData.username || 'Anonymous',
            following: userData.following || [],
          });
          
          // Fetch following profile data
          await fetchFollowing(userData.following || []);
        } else {
          setProfile(null);
          toast.error('User profile not found');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, userId, router]);

  const fetchFollowing = async (followingIds) => {
    if (!followingIds.length) {
      setFollowing([]);
      return;
    }

    try {
      const following = [];
      
      // Fetch data for each user being followed
      for (const followingId of followingIds) {
        const userRef = doc(db, 'users', followingId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          following.push({
            id: followingId,
            username: userData.username || 'Anonymous',
            photoURL: userData.photoURL || '',
            points: userData.points || 0
          });
        }
      }
      
      setFollowing(following);
    } catch (error) {
      console.error('Error fetching following:', error);
      toast.error('Error loading following users');
    }
  };

  const handleUnfollow = async (followingId, username) => {
    if (!isOwnProfile) return;

    try {
      // Remove from current user's following list
      const currentUserRef = doc(db, 'users', currentUser.uid);
      await updateDoc(currentUserRef, {
        following: arrayRemove(followingId)
      });
      
      // Remove current user from followed user's followers list
      const followedUserRef = doc(db, 'users', followingId);
      await updateDoc(followedUserRef, {
        followers: arrayRemove(currentUser.uid)
      });
      
      // Update local state
      setFollowing(following.filter(user => user.id !== followingId));
      
      // Update profile state
      if (profile && profile.following) {
        setProfile({
          ...profile,
          following: profile.following.filter(id => id !== followingId)
        });
      }
      
      toast.success(`Unfollowed ${username}`);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading following...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-4">Login Required</h2>
            <p className="text-gray-400 mb-6 text-center max-w-md">
              Please sign in to view user details
            </p>
            <div className="flex gap-3">
              <Link href="/login">
                <Button className="bg-indigo-600 hover:bg-indigo-700">Log In</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline">Sign Up</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-4">Profile Not Found</h2>
            <p className="text-gray-400 mb-6 text-center">
              The user profile you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
      <div className="container mx-auto max-w-2xl">
        <Link href={`/profile/${userId}`} className="text-gray-300 hover:text-white inline-flex items-center mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Profile
        </Link>
        
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-indigo-400" />
                {isOwnProfile ? 'People You Follow' : `${profile.username} Follows`}
              </CardTitle>
              <Badge className="bg-indigo-600/60 text-white">
                {following.length} following
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4">
            {following.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
                <p className="text-gray-400">
                  {isOwnProfile ? "You aren't following anyone yet." : "This user isn't following anyone yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {following.map((user) => (
                  <div key={user.id} className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center justify-between">
                    <Link href={`/profile/${user.id}`} className="flex items-center flex-grow hover:text-indigo-300">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.username} 
                          className="w-10 h-10 rounded-full mr-3 border border-white/20"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-indigo-800 rounded-full flex items-center justify-center mr-3 border border-white/20">
                          <span className="text-lg font-bold text-white">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <div>
                        <p className="font-medium text-white">{user.username}</p>
                        <p className="text-xs text-gray-400">{user.points} points</p>
                      </div>
                    </Link>
                    
                    {isOwnProfile && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleUnfollow(user.id, user.username)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}