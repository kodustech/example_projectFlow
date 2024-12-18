import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import rehypeSanitize from 'rehype-sanitize';

export function TaskDetail({ task, isOpen, onClose, onUpdate, onDelete }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [description, setDescription] = useState(task?.description || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      setShowDeleteConfirm(false);
    }
  }, [task]);

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    onUpdate(task.id, { description });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(task.id);
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleCloseClick = () => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
    } else {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="task-detail-overlay" onClick={handleOverlayClick}>
      <div className="task-detail" onClick={e => e.stopPropagation()}>
        <div className="task-detail-header">
          <h2>{task.content}</h2>
          <div className="task-detail-actions">
            {user && (
              <button 
                className={`delete-task-button ${showDeleteConfirm ? 'confirm' : ''}`}
                onClick={handleDelete}
              >
                {showDeleteConfirm ? 'Click to confirm deletion' : 'Delete'}
              </button>
            )}
            <button 
              className="close-button" 
              onClick={handleCloseClick}
              title={showDeleteConfirm ? "Cancel deletion" : "Close"}
            >
              {showDeleteConfirm ? 'Cancel' : '×'}
            </button>
          </div>
        </div>
        
        <div className="task-detail-content">
          <div className="task-description">
            <div className="description-header">
              <h3>Description</h3>
              {user && !showDeleteConfirm && (
                <button 
                  className="edit-button"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              )}
            </div>

            {user && isEditing && !showDeleteConfirm ? (
              <div className="description-editor" data-color-mode={isDark ? "dark" : "light"}>
                <MDEditor
                  value={description}
                  onChange={setDescription}
                  preview="live"
                  height={200}
                  hideToolbar={false}
                  enableScroll={true}
                  style={{
                    backgroundColor: isDark ? '#27272A' : '#ffffff',
                  }}
                  previewOptions={{
                    rehypePlugins: [[rehypeSanitize]],
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
              <div className="description-preview" data-color-mode={isDark ? "dark" : "light"}>
                <MDEditor.Markdown 
                  source={description || 'No description provided.'} 
                  rehypePlugins={[[rehypeSanitize]]}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'inherit'
                  }}
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