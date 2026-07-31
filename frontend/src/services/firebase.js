import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  sendPasswordResetEmail as fbSendResetEmail,
  updateProfile as fbUpdateProfile,
  onAuthStateChanged as fbOnAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isMockMode = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'mock-api-key';

let auth;
let mockAuthInstance = null;

if (!isMockMode) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log("🛡️ Firebase Client SDK initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Client SDK:", error);
    console.warn("⚠️ Falling back to Mock authentication mode.");
    setupMockAuth();
  }
} else {
  console.warn("⚠️ Firebase Client configured with mock keys. Running in MOCK Auth Mode.");
  setupMockAuth();
}

function setupMockAuth() {
  let authStateCallback = null;
  let currentUser = null;

  // Retrieve mock user from localStorage if it exists to persist login across page reloads!
  const savedUser = localStorage.getItem("pf_mock_user");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      if (currentUser) {
        // Re-attach the getIdToken method lost in JSON serialization
        currentUser.getIdToken = async () => `mock-token-${currentUser.email}-${currentUser.displayName || currentUser.email.split('@')[0]}-${currentUser.uid}`;
      }
    } catch (e) {
      currentUser = null;
    }
  }

  mockAuthInstance = {
    currentUser,
    onAuthStateChanged: (callback) => {
      authStateCallback = callback;
      // Trigger callback with initial state
      setTimeout(() => callback(currentUser), 100);
      return () => {
        authStateCallback = null;
      };
    },
    // Mock login
    signIn: async (email, password) => {
      if (!email || !password) throw new Error("Email and password are required");
      
      const displayName = email.split('@')[0];
      const uid = `mock-uid-${email.replace(/[^a-zA-Z0-9]/g, '')}`;
      
      currentUser = {
        email,
        displayName,
        uid,
        getIdToken: async () => `mock-token-${email}-${displayName}-${uid}`
      };
      
      localStorage.setItem("pf_mock_user", JSON.stringify(currentUser));
      mockAuthInstance.currentUser = currentUser;
      if (authStateCallback) authStateCallback(currentUser);
      return { user: currentUser };
    },
    // Mock signup
    signUp: async (email, password, displayName) => {
      if (!email || !password) throw new Error("Email and password are required");
      
      const uid = `mock-uid-${email.replace(/[^a-zA-Z0-9]/g, '')}`;
      currentUser = {
        email,
        displayName: displayName || email.split('@')[0],
        uid,
        getIdToken: async () => `mock-token-${email}-${displayName || email.split('@')[0]}-${uid}`
      };
      
      localStorage.setItem("pf_mock_user", JSON.stringify(currentUser));
      mockAuthInstance.currentUser = currentUser;
      if (authStateCallback) authStateCallback(currentUser);
      return { user: currentUser };
    },
    // Mock logout
    signOut: async () => {
      currentUser = null;
      mockAuthInstance.currentUser = null;
      localStorage.removeItem("pf_mock_user");
      if (authStateCallback) authStateCallback(null);
    },
    // Mock update profile
    updateProfile: async (user, profileData) => {
      if (currentUser) {
        currentUser.displayName = profileData.displayName || currentUser.displayName;
        mockAuthInstance.currentUser = currentUser;
        localStorage.setItem("pf_mock_user", JSON.stringify(currentUser));
        if (authStateCallback) authStateCallback(currentUser);
      }
    },
    // Mock password reset
    sendPasswordResetEmail: async (email) => {
      console.log(`[MOCK PASSWORD RESET] Email sent to: ${email}`);
      return true;
    }
  };
  auth = mockAuthInstance;
}

// Wrapper auth helper functions
export const signIn = async (email, password) => {
  if (isMockMode) {
    return auth.signIn(email, password);
  }
  return fbSignIn(auth, email, password);
};

export const signUp = async (email, password, displayName) => {
  let userCredential;
  if (isMockMode) {
    userCredential = await auth.signUp(email, password, displayName);
  } else {
    userCredential = await fbCreateUser(auth, email, password);
    if (displayName) {
      await fbUpdateProfile(userCredential.user, { displayName });
    }
  }
  return userCredential;
};

export const logout = async () => {
  if (isMockMode) {
    return auth.signOut();
  }
  return fbSignOut(auth);
};

export const resetPassword = async (email) => {
  if (isMockMode) {
    return auth.sendPasswordResetEmail(email);
  }
  return fbSendResetEmail(auth, email);
};

export const updateDisplayName = async (displayName) => {
  if (isMockMode) {
    return auth.updateProfile(auth.currentUser, { displayName });
  }
  if (!auth.currentUser) throw new Error("No user is logged in");
  return fbUpdateProfile(auth.currentUser, { displayName });
};

export const getAuthToken = async () => {
  if (!auth.currentUser) return null;
  if (isMockMode) {
    if (typeof auth.currentUser.getIdToken === 'function') {
      return auth.currentUser.getIdToken();
    }
    return `mock-token-${auth.currentUser.email}-${auth.currentUser.displayName || auth.currentUser.email.split('@')[0]}-${auth.currentUser.uid}`;
  }
  return auth.currentUser.getIdToken(true);
};

export { auth, isMockMode };
