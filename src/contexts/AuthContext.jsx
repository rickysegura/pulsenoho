// src/contexts/AuthContext.js - With combined user data
'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First, listen for auth state changes
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? user.uid : 'logged out');
      setCurrentUser(user);
      
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });
    
    return () => authUnsubscribe();
  }, []);
  
  // Set up a separate effect for Firestore user data
  useEffect(() => {
    let userUnsubscribe = () => {};
    
    if (currentUser) {
      console.log("Setting up Firestore listener for user:", currentUser.uid);
      const userRef = doc(db, 'users', currentUser.uid);
      
      userUnsubscribe = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            console.log("User data updated in Firestore:", docSnap.id);
            setUserData(docSnap.data());
          } else {
            console.log("No user document found");
            setUserData({
              username: currentUser.email?.split('@')[0] || 'User',
              points: 0
            });
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error getting user data:", error);
          setUserData({
            username: currentUser.email?.split('@')[0] || 'User',
            points: 0
          });
          setLoading(false);
        }
      );
    }
    
    return () => userUnsubscribe();
  }, [currentUser]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    currentUser,
    userData,
    loading
  }), [currentUser, userData, loading]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}