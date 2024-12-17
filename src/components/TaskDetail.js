import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import rehypeSanitize from 'rehype-sanitize';

export function TaskDetail({ task, isOpen, onClose, onUpdate }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [description, setDescription] = useState(task?.description || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
    }
  }, [task]);

  useEffect(() => {
    // Força o modo de cor no documento
    document.documentElement.setAttribute('data-color-mode', isDark ? 'dark' : 'light');
    
    return () => {
      document.documentElement.removeAttribute('data-color-mode');
    };
  }, [isDark]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    onUpdate(task.id, { description });
    setIsEditing(false);
  };

  return (
    <div className="task-detail-overlay" onClick={onClose}>
      <div className="task-detail" onClick={e => e.stopPropagation()}>
        <div className="task-detail-header">
          <h2>{task.content}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="task-detail-content">
          <div className="task-description">
            <div className="description-header">
              <h3>Description</h3>
              {user && (
                <button 
                  className="edit-button"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              )}
            </div>

            {user && isEditing ? (
              <div className="description-editor">
                <MDEditor
                  value={description}
                  onChange={setDescription}
                  preview="edit"
                  height={200}
                  visibleDragbar={false}
                  hideToolbar={true}
                  previewOptions={{
                    rehypePlugins: [[rehypeSanitize]],
                  }}
                  textareaProps={{
                    placeholder: 'Write your description here...',
                    style: {
                      backgroundColor: isDark ? '#27272A' : '#f8f9fa',
                      color: isDark ? '#FFFFFF' : '#202124'
                    }
                  }}
                />
                <div className="editor-actions">
                  <button 
                    className="save-button"
                    onClick={handleSave}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="description-preview">
                <MDEditor.Markdown 
                  source={description || 'No description provided.'} 
                  rehypePlugins={[[rehypeSanitize]]}
                />
              </div>
            )}
          </div>

          <div className="task-metadata">
            <div className="metadata-item">
              <span className="metadata-label">Created:</span>
              <span>{new Date(task.createdAt).toLocaleString()}</span>
            </div>
            {task.createdBy && (
              <div className="metadata-item">
                <span className="metadata-label">Created by:</span>
                <span>{task.createdBy}</span>
              </div>
            )}
            <div className="metadata-item">
              <span className="metadata-label">Votes:</span>
              <span>{task.votes || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 