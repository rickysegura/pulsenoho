'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, Users, User, X } from 'lucide-react';

export default function UserFollowers() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userId } = useParams();

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
            followers: userData.followers || [],
          });
          
          // Fetch followers profile data
          await fetchFollowers(userData.followers || []);
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

  const fetchFollowers = async (followerIds) => {
    if (!followerIds.length) {
      setFollowers([]);
      return;
    }

    try {
      const followers = [];
      
      // Fetch data for each follower
      for (const followerId of followerIds) {
        const userRef = doc(db, 'users', followerId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          followers.push({
            id: followerId,
            username: userData.username || 'Anonymous',
            photoURL: userData.photoURL || '',
            points: userData.points || 0,
            isFollowedByCurrentUser: userData.followers?.includes(currentUser.uid) || false
          });
        }
      }
      
      setFollowers(followers);
    } catch (error) {
      console.error('Error fetching followers:', error);
      toast.error('Error loading followers');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading followers...</p>
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
                {profile.username}'s Followers
              </CardTitle>
              <Badge className="bg-indigo-600/60 text-white">
                {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4">
            {followers.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
                <p className="text-gray-400">No followers yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followers.map((follower) => (
                  <Link href={`/profile/${follower.id}`} key={follower.id}>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
                      <div className="flex items-center">
                        {follower.photoURL ? (
                          <img 
                            src={follower.photoURL} 
                            alt={follower.username} 
                            className="w-10 h-10 rounded-full mr-3 border border-white/20"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-indigo-800 rounded-full flex items-center justify-center mr-3 border border-white/20">
                            <span className="text-lg font-bold text-white">
                              {follower.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <p className="font-medium text-white">{follower.username}</p>
                          <p className="text-xs text-gray-400">{follower.points} points</p>
                        </div>
                      </div>
                      
                      {currentUser.uid === follower.id ? (
                        <Badge className="bg-indigo-600 text-white">You</Badge>
                      ) : follower.isFollowedByCurrentUser ? (
                        <Badge className="bg-indigo-600/40 text-white text-xs">Following</Badge>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}