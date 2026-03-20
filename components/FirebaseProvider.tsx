import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileRef = doc(db, 'users', firebaseUser.uid);
          
          profileUnsubscribe = onSnapshot(profileRef, async (profileSnap) => {
            if (profileSnap.exists()) {
              const data = profileSnap.data() as UserProfile;
              const isAdminEmail = firebaseUser.email?.toLowerCase().includes('caneabacarhimiacane');
              
              // Detect location
              navigator.geolocation.getCurrentPosition(async (position) => {
                const location = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                if (JSON.stringify(data.location) !== JSON.stringify(location)) {
                  await setDoc(profileRef, { location }, { merge: true });
                }
              }, (error) => {
                console.error("Error getting location:", error);
              });

              if (isAdminEmail && data.role !== 'admin') {
                const updatedProfile = { ...data, role: 'admin' as const };
                setProfile(updatedProfile); // Set immediately for faster UI update
                await setDoc(profileRef, { role: 'admin' }, { merge: true });
              } else {
                setProfile(data);
              }
            } else {
              // Create default profile
              const isAdminEmail = firebaseUser.email?.toLowerCase().includes('caneabacarhimiacane');
              
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Usuário',
                email: firebaseUser.email || '',
                role: isAdminEmail ? 'admin' : 'customer'
              };
              setProfile(newProfile); // Set immediately to avoid waiting for snapshot
              await setDoc(profileRef, newProfile);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
        setProfile(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};
