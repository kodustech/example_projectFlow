import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useKanban } from '../hooks/useKanban';

export function Navbar() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { boardTitle, updateBoardTitle, addTask, updateColumn, columns } = useKanban();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(boardTitle);
  const [newTask, setNewTask] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showForms, setShowForms] = useState(false);
  const titleInputRef = useRef(null);

  const handleTitleClick = () => {
    if (user) {
      setIsEditingTitle(true);
      setEditedTitle(boardTitle);
    }
  };

  const handleTitleChange = (e) => {
const handleTitleBlur = async () => {
const debouncedSetLoading = debounce((value) => setIsLoading(value), 300);
debouncedSetLoading(true);
  setIsEditingTitle(false);
  if (editedTitle.trim() && editedTitle !== boardTitle) {
    try {
      await updateBoardTitle(editedTitle.trim());
    } catch (error) {
      setEditedTitle(boardTitle);
      console.error('Failed to update board title:', error);
      // Add user feedback mechanism here
    }
  } else {
    setEditedTitle(boardTitle);
  }
};
      setEditedTitle(boardTitle);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!user || !newTask.trim()) return;

    const task = {
id: crypto.randomUUID(),
      content: newTask,
      createdAt: new Date()
    };

    const firstColumnId = Object.values(columns)
      .sort((a, b) => a.order - b.order)[0]?.id;

    if (firstColumnId) {
      await addTask(firstColumnId, task);
      setNewTask('');
    }
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!user || !newColumnTitle.trim()) return;

    const columnId = newColumnTitle.toLowerCase().replace(/\s+/g, '-');
    const maxOrder = Math.max(...Object.values(columns).map(col => col.order), -1);
    
    await updateColumn(columnId, {
      id: columnId,
      title: newColumnTitle,
      tasks: [],
      order: maxOrder + 1,
      emoji: '📝',
      color: '#1a73e8'
    });
    
    setNewColumnTitle('');
  };

  return (
    <div className="navbar-container">
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
        <div className="navbar-center">
          {user && (
            <button 
              className="add-button"
              onClick={() => setShowForms(!showForms)}
              title={showForms ? "Esconder formulários" : "Adicionar task ou coluna"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
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
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`} 
                alt={user.displayName || 'User'} 
                title={user.displayName}
                onError={(e) => {
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`;
                }}
              />
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
      {showForms && user && (
        <div className="navbar-forms">
          <form onSubmit={handleAddTask} className="task-form">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task"
            />
            <button type="submit">Add Task</button>
          </form>

          <form onSubmit={handleAddColumn} className="column-form">
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="Add a new column"
            />
            <button type="submit">Add Column</button>
          </form>
        </div>
      )}
    </div>
  );
} 