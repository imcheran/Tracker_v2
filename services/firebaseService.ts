
import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import type { User, Auth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import type { Analytics } from "firebase/analytics";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

// CRITICAL: Side-effect imports to register 'auth' and 'firestore' components with the Firebase App
import "firebase/auth";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBliJyouiIZ0opeozDFvjUkcFBzVruOBzI",
  authDomain: "tracker-8fefe.firebaseapp.com",
  projectId: "tracker-8fefe",
  storageBucket: "tracker-8fefe.firebasestorage.app",
  messagingSenderId: "965709257556",
  appId: "1:965709257556:web:956f5086d934ad2ed946c1",
  measurementId: "G-131FE9F98E"
};

// --- Singleton Instances ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | undefined;

// --- Safe Initialization Logic ---
const initializeFirebase = () => {
  try {
    // 1. Initialize App (Modular & Idempotent)
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // 2. Initialize Auth
    try {
        // Pass app instance explicitly to getAuth to avoid "default app not found" or registration issues
        auth = getAuth(app);
        
        // Set persistence only if we have a valid auth instance
        if (auth) {
            setPersistence(auth, browserLocalPersistence).catch(e =>
              console.warn("Auth Persistence Warning:", e)
            );
        }
    } catch (authError) {
        console.error("Critical Auth Initialization Error:", authError);
        // We don't throw here to allow the app to function in offline/no-auth mode if needed
    }

    // 3. Initialize Firestore
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
    } catch (e) {
      console.warn("Firestore advanced persistence failed, falling back to default:", e);
      db = getFirestore(app);
    }

    // 4. Initialize Analytics (Client-side only)
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("Analytics failed to initialize", e);
      }
    }

    // 5. Initialize Capacitor Google Auth (Native Only)
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '965709257556-i7958klip6ut3mb5fgaffh2p55q3attn.apps.googleusercontent.com',
        scopes: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.events'],
        grantOfflineAccess: false,
      });
    }

    return true;
  } catch (error) {
    console.error("CRITICAL: Firebase Initialization Error", error);
    return false;
  }
};

// Run initialization immediately on module load
initializeFirebase();

// --- Public API ---
export const loginWithGoogle = async (): Promise<{ user: any; accessToken: string }> => {
  if (!auth) throw new Error("Authentication service not available");

  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        return {
          user: {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL
          },
          accessToken: googleUser.authentication.accessToken || ''
        };
      } catch (nativeError: any) {
        console.error("Native Google Sign-In Error:", nativeError);
        throw new Error(`Native Sign-In Failed: ${nativeError.message || JSON.stringify(nativeError)}. \n\nPOSSIBLE FIX: Ensure your app's SHA-1 fingerprint is added to Firebase Console > Project Settings > Your Android App.`);
      }
    } else {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
      }

      return {
        user: {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL
        },
        accessToken: credential?.accessToken || ''
      };
    }
  } catch (error: any) {
    console.error("Google login error", error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancelled by user.");
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`Domain not authorized. Please add '${window.location.hostname}' to Firebase Console > Authentication > Settings > Authorized Domains.`);
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Popup blocked. Please allow popups for this site.");
    }
    throw new Error(error.message || "An unknown error occurred during login.");
  }
};

export const logoutUser = async (): Promise<void> => {
  if (!auth) return;
  try {
    localStorage.removeItem('google_access_token');
    if (Capacitor.isNativePlatform()) {
      await GoogleAuth.signOut();
    }
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error", error);
  }
};

export const subscribeToAuthChanges = (callback: (user: any) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      });
    } else {
      callback(null);
    }
  });
};

export const saveUserDataToFirestore = async (uid: string, data: any) => {
  if (!db) return;
  try {
    const sanitized = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, "users", uid), sanitized, { merge: true });
  } catch (e) {
    console.error("Error saving data to Firestore", e);
  }
};

export const loadUserDataFromFirestore = async (uid: string) => {
  if (!db) return null;
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    console.error("Error loading data from Firestore", e);
    return null;
  }
};

export const subscribeToDataChanges = (uid: string, callback: (data: any) => void) => {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "users", uid),
    (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      }
    },
    (error) => {
      console.error("Snapshot listener error:", error);
    }
  );
};

// --- Partner Linking Functions (Improved Model) ---

import { runTransaction, serverTimestamp, arrayUnion } from "firebase/firestore";

/**
 * Generate a temporary invite code for partner linking
 * Stores in partnerInvites/{code} collection
 */
export const generateInviteCode = async (senderUid: string): Promise<string> => {
  if (!db) throw new Error("Firestore not initialized");
  
  const code = Math.random().toString(36).substring(2, 15).toUpperCase();
  const inviteRef = doc(db, "partnerInvites", code);
  
  await setDoc(inviteRef, {
    senderUid,
    used: false,
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });
  
  return code;
};

/**
 * Link two partners using invite code with atomic transaction
 * Creates couples/{coupleId} and updates both users atomically
 */
export const linkPartnerByCode = async (currentUid: string, inviteCode: string): Promise<string> => {
  if (!db) throw new Error("Firestore not initialized");
  
  const inviteRef = doc(db, "partnerInvites", inviteCode);
  
  return runTransaction(db, async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);
    
    if (!inviteSnap.exists()) {
      throw new Error("Invalid invite code");
    }
    
    const invite = inviteSnap.data();
    
    if (invite.used) {
      throw new Error("Invite code already used");
    }
    
    if (invite.senderUid === currentUid) {
      throw new Error("You cannot link with yourself");
    }
    
    const senderRef = doc(db, "users", invite.senderUid);
    const currentRef = doc(db, "users", currentUid);
    
    const senderSnap = await transaction.get(senderRef);
    const currentSnap = await transaction.get(currentRef);
    
    const sender = senderSnap.data();
    const current = currentSnap.data();
    
    if (sender?.isCoupled || current?.isCoupled) {
      throw new Error("One of the users is already linked");
    }
    
    // Generate coupleId from sorted UIDs
    const coupleId = [invite.senderUid, currentUid].sort().join("_");
    const coupleRef = doc(db, "couples", coupleId);
    
    // Create couple document
    transaction.set(coupleRef, {
      user1: invite.senderUid,
      user2: currentUid,
      members: [invite.senderUid, currentUid],
      createdAt: serverTimestamp(),
      status: "active"
    });
    
    // Update sender user doc
    transaction.update(senderRef, {
      partnerUid: currentUid,
      coupleId,
      isCoupled: true,
      updatedAt: serverTimestamp(),
    });
    
    // Update current user doc
    transaction.update(currentRef, {
      partnerUid: invite.senderUid,
      coupleId,
      isCoupled: true,
      updatedAt: serverTimestamp(),
    });
    
    // Mark invite as used
    transaction.update(inviteRef, {
      used: true,
      usedBy: currentUid,
      usedAt: serverTimestamp(),
    });
    
    return coupleId;
  });
};

/**
 * Unlink a partner - removes couple relationship
 */
export const unlinkPartner = async (uid: string): Promise<void> => {
  if (!db) throw new Error("Firestore not initialized");
  
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }
  
  const { partnerId, coupleId } = userSnap.data();
  
  if (!partnerId || !coupleId) {
    throw new Error("User is not coupled");
  }
  
  return runTransaction(db, async (transaction) => {
    const partnerRef = doc(db, "users", partnerId);
    const coupleRef = doc(db, "couples", coupleId);
    
    // Update current user
    transaction.update(userRef, {
      partnerUid: null,
      coupleId: null,
      isCoupled: false,
      updatedAt: serverTimestamp(),
    });
    
    // Update partner user
    transaction.update(partnerRef, {
      partnerUid: null,
      coupleId: null,
      isCoupled: false,
      updatedAt: serverTimestamp(),
    });
    
    // Mark couple as inactive (don't delete, keep for history)
    transaction.update(coupleRef, {
      status: "inactive",
      inactivatedAt: serverTimestamp(),
    });
  });
};

/**
 * Subscribe to couple data in real-time
 */
export const subscribeToCoupleData = (coupleId: string, callback: (data: any) => void) => {
  if (!db) return () => {};
  
  return onSnapshot(
    doc(db, "couples", coupleId),
    (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      }
    },
    (error) => {
      console.error("Couple data snapshot error:", error);
    }
  );
};
