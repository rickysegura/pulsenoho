'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, doc as firestoreDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ArrowLeft, Search, Users } from 'lucide-react';

export default function MessagesPage() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const router = useRouter();
  
  // Add ref to store unsubscribe functions
  const unsubscribersRef = useRef([]);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const fetchConversations = async () => {
      try {
        // Fetch all messages where the current user is involved (either as sender or recipient)
        const messageQuery1 = query(
          collection(db, 'messages'),
          where('participants', 'array-contains', currentUser.uid),
          orderBy('lastMessageTimestamp', 'desc')
        );
        
        // Use onSnapshot instead of getDocs to listen for real-time updates
        const unsubscribe = onSnapshot(messageQuery1, async (messagesSnapshot) => {
          if (messagesSnapshot.empty) {
            setConversations([]);
            setLoading(false);
            return;
          }
          
          // Format conversations with user details
          const conversationsWithDetails = await Promise.all(
            messagesSnapshot.docs.map(async (docSnapshot) => {
              const conversationData = docSnapshot.data();
              
              // Determine the other user in the conversation
              const otherUserId = conversationData.participants.find(id => id !== currentUser.uid);
              
              // Get the other user's details
              const userRef = firestoreDoc(db, 'users', otherUserId);
              const userSnap = await getDoc(userRef);
              const userData = userSnap.exists() ? userSnap.data() : { username: 'Unknown User' };
              
              return {
                id: docSnapshot.id,
                otherUserId,
                username: userData.username || 'Unknown User',
                photoURL: userData.photoURL || '',
                lastMessage: conversationData.lastMessage || 'No messages yet',
                lastMessageTimestamp: conversationData.lastMessageTimestamp?.toDate() || new Date(),
                unreadCount: conversationData.unreadCount?.[currentUser.uid] || 0
              };
            })
          );
          
          setConversations(conversationsWithDetails);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching conversations:', error);
          setLoading(false);
        });
        
        // Store the unsubscribe function
        unsubscribersRef.current.push(unsubscribe);
      } catch (error) {
        console.error('Error setting up conversation listener:', error);
        setLoading(false);
      }
    };

    // Also fetch all users for the search functionality
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs
          .map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
          }))
          .filter(user => user.id !== currentUser.uid); // Exclude current user
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchConversations();
    fetchUsers();

    // Cleanup function to unsubscribe from all listeners when component unmounts
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current = [];
    };
  }, [currentUser, router]);

  // Handle search functionality
  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, users]);

  const startNewConversation = (userId, username) => {
    const chatId = [currentUser.uid, userId].sort().join('_');
    router.push(`/messages/${chatId}?recipient=${userId}&name=${username}`);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    // If message is from today, show time
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If message is from this week, show day name
    const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-3">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Messages</h1>
          </div>
          <Link href="/messages/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <MessageSquare className="h-4 w-4 mr-1" /> New Message
            </Button>
          </Link>
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
          
          {searchResults.length > 0 && (
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 mt-2">
              <CardContent className="p-2">
                <div className="max-h-60 overflow-y-auto">
                  {searchResults.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-white/10 rounded-md cursor-pointer"
                      onClick={() => startNewConversation(user.id, user.username)}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center mr-2">
                          <span className="text-sm font-medium text-white">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.username || 'Unknown User'}</p>
                          <p className="text-xs text-gray-400">{user.email || ''}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">
                        Message
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Conversations List */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">Recent Conversations</CardTitle>
          </CardHeader>
          
          <CardContent>
            {conversations.length > 0 ? (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <Link href={`/messages/${conversation.id}`} key={conversation.id}>
                    <div className="flex items-center justify-between p-3 hover:bg-white/10 rounded-md cursor-pointer">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-white">
                            {conversation.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-white">{conversation.username}</p>
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(conversation.lastMessageTimestamp)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-300 truncate">{conversation.lastMessage}</p>
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-indigo-600 text-white text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 mb-2">No conversations yet</p>
                <p className="text-gray-500 text-sm mb-4">Start messaging with other members of the community</p>
                <Button 
                  onClick={() => router.push('/messages/new')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Users className="h-4 w-4 mr-1" /> Find People
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}