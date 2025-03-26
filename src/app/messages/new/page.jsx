'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, MessageSquare, Users } from 'lucide-react';
import UserAvatar from '../../../components/UserAvatar';

export default function NewMessagePage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(user => user.id !== currentUser.uid); // Exclude current user
        
        setUsers(usersData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, router]);

  // Filter users based on search term
  const filteredUsers = searchTerm
    ? users.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    : users;

  const startConversation = (userId, username) => {
    const chatId = [currentUser.uid, userId].sort().join('_');
    router.push(`/messages/${chatId}?recipient=${userId}&name=${username}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="flex items-center mb-6">
          <Link href="/messages" className="mr-3">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">New Message</h1>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/10 border-white/20 text-white pl-10"
            />
          </div>
        </div>
        
        {/* Users List */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">
              {searchTerm ? 'Search Results' : 'All Users'}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-white/10 rounded-md cursor-pointer"
                    onClick={() => startConversation(user.id, user.username)}
                  >
                    <div className="flex items-center">
                      <UserAvatar user={user} className="mr-3" />
                      <div>
                        <p className="font-medium text-white">{user.username || 'Unknown User'}</p>
                        <p className="text-sm text-gray-400">{user.email || ''}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" /> Message
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
                <Users className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 mb-2">No users found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm 
                    ? 'Try a different search term' 
                    : 'There are no other users in the system yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}