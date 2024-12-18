import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="login-container">
      <h1>Welcome to Kanban Board</h1>
      <p>Please sign in to add or move tasks</p>
      <button onClick={signInWithGoogle} className="login-button">
        Sign in with Google
      </button>
    </div>
  );
} 