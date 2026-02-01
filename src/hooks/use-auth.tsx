'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, WeightGoal, HealthCondition } from '@/lib/types';
import type { LoginSchema, SignUpSchema } from '@/lib/schemas';
import type { z } from 'zod';
import { FullScreenLoader } from '@/components/loader';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (data: z.infer<typeof SignUpSchema>) => Promise<void>;
  signInWithEmail: (data: z.infer<typeof LoginSchema>) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (profileData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function createUserProfile(user: FirebaseUser, name?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email!,
    name: name || user.displayName || 'New User',
    healthConditions: [],
    weightGoals: 'maintain weight' as WeightGoal,
    createdAt: new Date(),
  };
  await setDoc(userRef, userProfile);
  return userProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data() as UserProfile);
        } else {
          // Create profile if it doesn't exist (e.g., first-time Google sign-in)
          const newUserProfile = await createUserProfile(fbUser);
          setUser(newUserProfile);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (data: z.infer<typeof SignUpSchema>) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      await createUserProfile(userCredential.user, data.name);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signInWithEmail = async (data: z.infer<typeof LoginSchema>) => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };
  
  const updateUserProfile = async (profileData: Partial<UserProfile>) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, profileData, { merge: true });
      setUser(prev => prev ? { ...prev, ...profileData } : null);
    }
  };


  const value = {
    user,
    firebaseUser,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <FullScreenLoader /> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
