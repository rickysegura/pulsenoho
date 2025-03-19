// src/app/forum/page.js
'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, getDoc, limit, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { addSnapshot } from '../../lib/snapshotManager';
import { Plus, Home, MessageSquare, ArrowLeft } from 'lucide-react';

export default function Forum() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ title: '', description: '' });
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }

    // Load available chat rooms
    const chatRoomsQuery = query(
      collection(db, 'chatRooms'),
      where('approved', '==', true)
      // Remove the orderBy to avoid requiring a composite index
      // We'll sort the rooms client-side instead
    );
    
    addSnapshot(onSnapshot(chatRoomsQuery, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort rooms client-side by createdAt in descending order
      roomData.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setChatRooms(roomData);
      setLoading(false);
    }));
    
    // If roomId is provided, set it as active chat room
    if (roomId) {
      fetchChatRoom(roomId);
    }
  }, [currentUser, router, roomId]);
  
  // Add a separate useEffect to handle when roomId becomes null
  useEffect(() => {
    // If roomId is null, clear the active chat room
    if (roomId === null) {
      setActiveChatRoom(null);
    }
  }, [roomId]);
  
  useEffect(() => {
    // Only load messages if we have an active chat room
    if (!activeChatRoom) return;
    
    const q = query(
      collection(db, 'chatRooms', activeChatRoom.id, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(30)
    );
    
    const unsubscribe = addSnapshot(onSnapshot(q, async (snapshot) => {
      try {
        const messageData = await Promise.all(
          snapshot.docs.map(async (messageDoc) => {
            const data = messageDoc.data();
            let photoURL = '';
            
            try {
              const userRef = doc(db, 'users', data.userId);
              const userSnap = await getDoc(userRef);
              photoURL = userSnap.exists() ? userSnap.data().photoURL || '' : '';
            } catch (err) {
              console.error('Error fetching user data:', err);
            }
            
            return {
              id: messageDoc.id,
              userId: data.userId,
              username: data.username || 'Anonymous',
              photoURL,
              text: data.text,
              timestamp: data.timestamp,
              formattedTime: data.timestamp?.toDate().toLocaleTimeString() || 'Sending...'
            };
          })
        );
        
        setMessages(messageData);
      } catch (error) {
        console.error('Error processing messages:', error);
      }
    }));
  }, [activeChatRoom]);
  
  const fetchChatRoom = async (roomId) => {
    try {
      const roomRef = doc(db, 'chatRooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (roomSnap.exists() && roomSnap.data().approved) {
        setActiveChatRoom({ id: roomSnap.id, ...roomSnap.data() });
      } else {
        // Room doesn't exist or isn't approved
        toast.error('Chat room not found or not yet approved');
        // Use replace instead of push to avoid adding to history
        router.replace('/forum');
      }
    } catch (error) {
      console.error('Error fetching chat room:', error);
      toast.error('Failed to load chat room');
      // Use replace instead of push to avoid adding to history
      router.replace('/forum');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatRoom) return;

    try {
      let username = currentUser.displayName || 'Anonymous';
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        username = userSnap.data().username || username;
      }

      await addDoc(collection(db, 'chatRooms', activeChatRoom.id, 'messages'), {
        userId: currentUser.uid,
        username,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };
  
  const handleCreateRoomRequest = async (e) => {
    e.preventDefault();
    if (!newRoom.title.trim()) return;
    
    try {
      await addDoc(collection(db, 'chatRooms'), {
        title: newRoom.title.trim(),
        description: newRoom.description.trim(),
        creatorId: currentUser.uid,
        approved: false, // Requires admin approval
        createdAt: serverTimestamp(),
      });
      
      toast.success('Chat room request submitted for approval!');
      setShowNewRoomModal(false);
      setNewRoom({ title: '', description: '' });
    } catch (error) {
      console.error('Error creating chat room request:', error);
      toast.error('Failed to submit chat room request');
    }
  };
  
  const handleRoomSelect = (room) => {
    router.push(`/forum?room=${room.id}`);
  };
  
  // Add this function to clear the active room
  const handleBackToRooms = () => {
    setActiveChatRoom(null);
    router.push('/forum');
  };

  if (loading) {
    return <p className="text-gray-400 text-center">Loading forum...</p>;
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Chat Room Creation Modal */}
      {showNewRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold">Request a New Chat Room</h2>
              <p className="text-gray-400 text-sm mt-1">
                Your request will be reviewed by an admin. Once approved, your chat room will be available to all users.
              </p>
            </div>
            
            <form onSubmit={handleCreateRoomRequest} className="p-4">
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1">Room Title *</label>
                <Input
                  value={newRoom.title}
                  onChange={(e) => setNewRoom({...newRoom, title: e.target.value})}
                  placeholder="Give your chat room a name"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                  placeholder="What will this room be about?"
                  className="w-full min-h-[100px] bg-gray-700 border border-gray-600 rounded-md p-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  onClick={() => setShowNewRoomModal(false)}
                  variant="outline" 
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Card className="w-full flex-1 flex flex-col bg-white/10 backdrop-blur-lg border-white/20 shadow-lg rounded-none">
        <CardHeader className="border-b border-white/20 py-3">
          <CardTitle className="text-2xl font-semibold text-white flex justify-between items-center">
            <span>{activeChatRoom ? activeChatRoom.title : 'Community Forum'}</span>
            <div className="flex space-x-2">
              {activeChatRoom && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleBackToRooms} 
                  className="text-gray-300 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Rooms
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')} 
                className="text-gray-300 hover:text-white"
              >
                <Home className="h-4 w-4 mr-1" />
                Home
              </Button>
            </div>
          </CardTitle>
          {activeChatRoom && (
            <CardDescription className="text-gray-300 mt-1">
              {activeChatRoom.description}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="p-0 flex-1 flex flex-col">
          {activeChatRoom ? (
            // Chat room view
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-400 my-8">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        msg.userId === currentUser.uid
                          ? 'bg-white/20 ml-auto max-w-[70%]'
                          : 'bg-gray-800 mr-auto max-w-[70%]'
                      } transition-all hover:bg-opacity-90`}
                    >
                      {msg.photoURL ? (
                        <Image
                          src={msg.photoURL}
                          alt={`${msg.username}'s avatar`}
                          width={40}
                          height={40}
                          className="rounded-full border-2 border-white/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/20">
                          <span className="text-white font-semibold">{msg.username.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">
                          <Link href={`/profile/${msg.userId}`} className="font-semibold text-white hover:underline">
                            {msg.username}
                          </Link>{' '}
                          <span className="text-gray-400 text-xs">
                            at {msg.formattedTime}
                          </span>
                        </p>
                        <p className="text-white break-words">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <form
                onSubmit={handleSendMessage}
                className="sticky bottom-0 bg-gradient-to-t from-gray-900/80 to-transparent p-4 border-t border-white/20"
              >
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="bg-white/10 border-white/20 text-white flex-1 focus:ring-2 focus:ring-white/30"
                  />
                  <Button 
                    type="submit" 
                    className="bg-white/20 text-white hover:bg-white/30"
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </Button>
                </div>
              </form>
            </>
          ) : (
            // Chat room selection view
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Available Chat Rooms</h2>
                <Button 
                  onClick={() => setShowNewRoomModal(true)} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" /> Request New Room
                </Button>
              </div>
              
              {chatRooms.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No chat rooms available yet</h3>
                  <p className="text-gray-400 mb-4">Be the first to request a new chat room!</p>
                  <Button 
                    onClick={() => setShowNewRoomModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Request New Room
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chatRooms.map((room) => (
                    <Card 
                      key={room.id} 
                      className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleRoomSelect(room)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{room.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                          {room.description || 'No description provided'}
                        </p>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>Created: {room.createdAt?.toDate().toLocaleDateString() || 'Recently'}</span>
                          <Button 
                            size="sm" 
                            className="text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            Join Chat
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}