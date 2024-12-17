import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useKanban } from '../hooks/useKanban';

export function Navbar() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { boardTitle, updateBoardTitle } = useKanban();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(boardTitle);
  const titleInputRef = useRef(null);

  const handleTitleClick = () => {
    if (user) {
      setIsEditingTitle(true);
      setEditedTitle(boardTitle);
    }
  };

  const handleTitleChange = (e) => {
    setEditedTitle(e.target.value);
  };

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (editedTitle.trim() && editedTitle !== boardTitle) {
      await updateBoardTitle(editedTitle.trim());
    } else {
      setEditedTitle(boardTitle);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="board-title-input"
            autoFocus
          />
        ) : (
          <h1 
            onClick={handleTitleClick}
            className="board-title"
            style={{ cursor: user ? 'pointer' : 'default' }}
          >
            {boardTitle}
          </h1>
        )}
      </div>
      <div className="navbar-right">
        <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        {user ? (
          <div className="user-menu">
            <img src={user.photoURL} alt={user.displayName} title={user.displayName} />
            <button onClick={signOut} className="logout-button">
              Sign out
            </button>
          </div>
        ) : (
          <button onClick={signInWithGoogle} className="login-button">
            Sign in with Google
          </button>
        )}
      </div>
    </nav>
  );
} 