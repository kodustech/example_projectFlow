import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import rehypeSanitize from 'rehype-sanitize';

const LABEL_COLORS = [
  '#1a73e8', '#dc3545', '#28a745', '#ffc107', 
  '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'
];

export function TaskDetail({ task, isOpen, onClose, onUpdate, onDelete, onAddLabel, onRemoveLabel }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [description, setDescription] = useState(task?.description || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [selectedColor, setSelectedColor] = useState(LABEL_COLORS[0]);
  const [dueDate, setDueDate] = useState(() => {
    if (!task?.dueDate) return null;
    const date = new Date(task.dueDate);
    return isNaN(date.getTime()) ? null : date;
  });

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      const date = task.dueDate ? new Date(task.dueDate) : null;
      setDueDate(isNaN(date?.getTime()) ? null : date);
      setShowDeleteConfirm(false);
      setShowLabelForm(false);
      setNewLabelText('');
    }
  }, [task]);

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setShowLabelForm(false);
    }
  }, [isOpen]);

  useEffect(() => {
    console.log('TaskDetail montado com task:', task);
  }, [task]);

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

  const handleAddLabel = () => {
    if (newLabelText.trim()) {
      console.log('Tentando adicionar label:', {
        taskId: task.id,
        text: newLabelText.trim(),
        color: selectedColor
      });
      
      onAddLabel(task.id, {
        text: newLabelText.trim(),
        color: selectedColor
      });
      setNewLabelText('');
      setShowLabelForm(false);
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

  const handleDueDateChange = (date) => {
    setDueDate(date);
    onUpdate(task.id, { dueDate: date ? date.toISOString() : null });
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
          {/* Due Date Section */}
          <div className="task-due-date-section">
            <div className="due-date-header">
              <h3>Due Date</h3>
            </div>
            {user && !showDeleteConfirm ? (
              <DatePicker
                selected={dueDate}
                onChange={handleDueDateChange}
                dateFormat="MMMM d, yyyy"
                className="due-date-picker"
                placeholderText="Set due date"
                isClearable
                showYearDropdown
                scrollableYearDropdown
              />
            ) : (
              <div className="due-date-display">
                {dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date set'}
              </div>
            )}
          </div>

          {/* Labels Section */}
          <div className="task-labels-section">
            <div className="labels-header">
              <h3>Labels</h3>
              {user && !showDeleteConfirm && (
                <button 
                  className="add-label-button"
                  onClick={() => setShowLabelForm(!showLabelForm)}
                >
                  {showLabelForm ? 'Cancel' : 'Add Label'}
                </button>
              )}
            </div>
            
            {showLabelForm && (
              <div className="label-form">
                <input
                  type="text"
                  value={newLabelText}
                  onChange={(e) => setNewLabelText(e.target.value)}
                  placeholder="Enter label text"
                  className="label-input"
                  maxLength={50}
                  autoFocus
                />
                <div className="color-options">
                  {LABEL_COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-option ${color === selectedColor ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
                <button 
                  className="save-label-button"
                  onClick={handleAddLabel}
                  disabled={!newLabelText.trim()}
                >
                  Add Label
                </button>
              </div>
            )}
            
            <div className="labels-list">
              {(task.labels || []).map(label => (
                <div 
                  key={label.id} 
                  className="label-item"
                  style={{ backgroundColor: label.color }}
                >
                  <span>{label.text}</span>
                  {user && (
                    <button
                      className="remove-label-button"
                      onClick={() => onRemoveLabel(task.id, label.id)}
                      title="Remove label"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {(!task.labels || task.labels.length === 0) && (
                <div className="no-labels-message">
                  No labels added yet
                </div>
              )}
            </div>
          </div>

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
              <span>{new Date(task.createdAt?.seconds * 1000 || task.createdAt).toLocaleString()}</span>
            </div>
            {task.createdBy && (
              <div className="metadata-item">
                <span className="metadata-label">Created by:</span>
                <span>User {task.createdBy.substring(0, 8)}</span>
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