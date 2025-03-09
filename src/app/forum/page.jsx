// src/app/forum/page.js
'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import '../globals.css';
import Link from 'next/link';

export default function Forum() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }

    const q = query(collection(db, 'forum'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messageData = await Promise.all(
        snapshot.docs.map(async (messageDoc) => { // Renamed 'doc' to 'messageDoc'
          const data = messageDoc.data();
          const userRef = doc(db, 'users', data.userId); // Now uses imported 'doc'
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};
          return {
            id: messageDoc.id,
            userId: data.userId,
            username: data.username || 'Anonymous',
            photoURL: userData.photoURL || '',
            text: data.text,
            timestamp: data.timestamp,
          };
        })
      );
      setMessages(messageData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching forum messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, router]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'forum'), {
        userId: currentUser.uid,
        username: currentUser.displayName || (await getDoc(doc(db, 'users', currentUser.uid))).data().username || 'Anonymous',
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-center">Loading forum...</p>;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
      <Card className="w-full max-w-3xl bg-white/10 backdrop-blur-lg border-white/20 shadow-lg">
        <CardHeader className="border-b border-white/20">
          <CardTitle className="text-2xl font-semibold text-white">Community Forum</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  msg.userId === currentUser.uid
                    ? 'bg-white/20 ml-auto max-w-[70%]'
                    : 'bg-gray-800 mr-auto max-w-[70%]'
                }`}
              >
                {msg.photoURL && (
                  <Image
                    src={msg.photoURL}
                    alt={`${msg.username}'s avatar`}
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-white/20"
                  />
                )}
                <div className="flex-1">
                  <p className="text-gray-300 text-sm">
                    <Link href={`/profile/${msg.userId}`} className="font-semibold text-white hover:underline">{msg.username}</Link> at{' '}
                    {msg.timestamp?.toDate().toLocaleTimeString() || 'Sending...'}
                  </p>
                  <p className="text-white break-words">{msg.text}</p>
                </div>
              </div>
            ))}
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
              <Button type="submit" className="bg-white/20 text-white hover:bg-white/30">Send</Button>
            </div>
          </form>
          <div className="p-4">
            <Button onClick={() => router.push('/')} className="w-full bg-gray-700 text-white hover:bg-gray-600">Back to Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}