import React, { createContext, useContext } from 'react';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, loading, error] = useAuthState(auth);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Verifica se o email termina com @kodus.io
      if (!result.user.email.endsWith('@kodus.io')) {
        // Se não for um email válido, faz logout e mostra erro
        await firebaseSignOut(auth);
        alert('Apenas emails @kodus.io são permitidos');
        return;
      }
      
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const signOut = () => {
    firebaseSignOut(auth);
  };

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 