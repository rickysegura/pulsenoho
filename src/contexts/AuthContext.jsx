'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';

// Create the auth context
const AuthContext = createContext();

// Auth provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Store all active Firebase listeners for proper cleanup
  const [activeListeners, setActiveListeners] = useState([]);

  // Handle adding a new listener
  const addListener = (unsubscribe) => {
    setActiveListeners(prev => [...prev, unsubscribe]);
    return unsubscribe;
  };

  // Handle removing a listener
  const removeListener = (unsubscribe) => {
    setActiveListeners(prev => prev.filter(listener => listener !== unsubscribe));
    unsubscribe();
  };

  // Clear all listeners
  const clearAllListeners = () => {
    activeListeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    setActiveListeners([]);
  };

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      clearAllListeners();
    };
  }, []);

  // Sign up function
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Sign in function
  const signin = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Sign out function
  const signout = async () => {
    // Clear all listeners first to prevent permission errors
    clearAllListeners();
    
    // Then sign out
    await firebaseSignOut(auth);
    setCurrentUser(null);
  };

  // Value to be provided to consumers
  const value = {
    currentUser,
    signin,
    signup,
    signout,
    loading,
    addListener,
    removeListener
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}