import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import rehypeSanitize from 'rehype-sanitize';
import { formatDuration } from '../utils/timeUtils';
import { TimeTracker } from './TimeTracker';

const LABEL_COLORS = [
  '#1a73e8', '#dc3545', '#28a745', '#ffc107', 
  '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'
];

const PRIORITY_LEVELS = {
  HIGH: { label: 'High', color: '#dc3545' },
  MEDIUM: { label: 'Medium', color: '#ffc107' },
  LOW: { label: 'Low', color: '#28a745' }
};

export function TaskDetail({ task, isOpen, onClose, onUpdate, onDelete, onAddLabel, onRemoveLabel }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'MEDIUM');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [selectedColor, setSelectedColor] = useState(LABEL_COLORS[0]);
  const [newComment, setNewComment] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    if (!task?.dueDate) return null;
    const date = new Date(task.dueDate);
    return isNaN(date.getTime()) ? null : date;
  });
  const [isTracking, setIsTracking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('development');

  // Categories for time tracking
  const categories = {
    development: { label: 'Development', color: '#28a745' },
    planning: { label: 'Planning', color: '#17a2b8' },
    testing: { label: 'Testing', color: '#ffc107' },
    bugfix: { label: 'Bug Fix', color: '#dc3545' },
    meeting: { label: 'Meeting', color: '#6f42c1' },
    other: { label: 'Other', color: '#6c757d' }
  };

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      setPriority(task.priority || 'MEDIUM');
      const date = task.dueDate ? new Date(task.dueDate) : null;
      setDueDate(isNaN(date?.getTime()) ? null : date);
      setShowDeleteConfirm(false);
      setShowLabelForm(false);
      setNewLabelText('');
      setNewComment('');
    }
  }, [task]);

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setShowLabelForm(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('TaskDetail mounted with task:', task);
    }  
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    onUpdate(task.id, {
      description,
      priority,
      dueDate: dueDate?.toISOString(),
    });
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

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    
    const comment = {
      id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      createdByName: user.email?.split('@')[0] || 'Anonymous'
    };

    const updatedComments = [...(task.comments || []), comment];
    onUpdate(task.id, { comments: updatedComments });
    setNewComment('');
  };

  const handleDeleteComment = (commentId) => {
    if (!user) return;
    
    const updatedComments = (task.comments || []).filter(
      comment => comment.id !== commentId
    );
    onUpdate(task.id, { comments: updatedComments });
  };

  const getActivityFeed = () => {
    const activities = [];

    // Add time entries
    (task.timeEntries || []).forEach(entry => {
      activities.push({
        type: 'time',
        timestamp: entry.startTime,
        data: entry
      });
    });

    // Add comments
    (task.comments || []).forEach(comment => {
      activities.push({
        type: 'comment',
        timestamp: new Date(comment.createdAt).getTime(),
        data: comment
      });
    });

    // Sort by timestamp, newest first
    return activities.sort((a, b) => b.timestamp - a.timestamp);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleStartTracking = () => {
    setIsTracking(true);
    onUpdate(task.id, {
      timeEntries: [...(task.timeEntries || []), {
        category: selectedCategory,
        startTime: Date.now(),
        ongoing: true
      }]
    });
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    const entries = task.timeEntries || [];
    const currentEntry = entries[entries.length - 1];
    
    if (currentEntry && currentEntry.ongoing) {
      const updatedEntries = entries.slice(0, -1);
      updatedEntries.push({
        ...currentEntry,
        endTime: Date.now(),
        duration: Date.now() - currentEntry.startTime,
        ongoing: false
      });
      
      onUpdate(task.id, { timeEntries: updatedEntries });
    }
  };

  const handleDeleteTimeEntry = (index) => {
    const entries = task.timeEntries || [];
    const updatedEntries = [...entries];
    updatedEntries.splice(index, 1);
    onUpdate(task.id, { timeEntries: updatedEntries });
  };

  return (
    <div className={`task-detail-overlay ${isDark ? 'dark' : ''}`} onClick={handleOverlayClick}>
      <div className="task-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="task-detail-header">
          <h2>{task.content}</h2>
          <button 
            className="close-button" 
            onClick={handleCloseClick}
            title={showDeleteConfirm ? "Cancel deletion" : "Close"}
          >
            ×
          </button>
        </div>
        
        <div className="task-detail-content">
          <div className="task-detail-main">
            {/* Priority Section */}
            <div className="task-priority-selector">
              <label>Priority</label>
              <div className="priority-options">
                {Object.entries(PRIORITY_LEVELS).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setPriority(key);
                      handleSave();
                    }}
                    className={`priority-button ${priority === key ? 'selected' : ''}`}
                    style={{
                      backgroundColor: priority === key ? color : 'transparent',
                      color: priority === key ? 'white' : color,
                      borderColor: color
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Section */}
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

            {/* Activity Section */}
            <div className="activity-section">
              <div className="section-header">
                <h3>Activity</h3>
                <div className="activity-controls">
                  {user && (
                    <>
                      <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="category-select"
                      >
                        {Object.entries(categories).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      
                      <button
                        className={`tracking-button ${isTracking ? 'tracking' : ''}`}
                        onClick={isTracking ? handleStopTracking : handleStartTracking}
                      >
                        {isTracking ? 'Stop' : 'Start Tracking'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {user && (
                <div className="comment-form">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="comment-input"
                    rows={3}
                  />
                  <button 
                    className="add-comment-button"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    Add Comment
                  </button>
                </div>
              )}

              <div className="activity-feed">
                {getActivityFeed().map((activity, index) => (
                  <div key={index} className="activity-item">
                    {activity.type === 'time' ? (
                      <>
                        <div 
                          className="activity-marker"
                          style={{ backgroundColor: categories[activity.data.category || 'other'].color }}
                        />
                        <div className="activity-content">
                          <div className="activity-text">
                            <strong>{categories[activity.data.category || 'other'].label}</strong>
                            {' - '}
                            {activity.data.ongoing ? (
                              <span className="ongoing">Tracking now... {formatDuration(Date.now() - activity.data.startTime)}</span>
                            ) : (
                              <span>{formatDuration(activity.data.duration)}</span>
                            )}
                          </div>
                          <div className="activity-time">
                            {formatTime(activity.timestamp)}
                          </div>
                        </div>
                        {!activity.data.ongoing && (
                          <button
                            className="delete-entry"
                            onClick={() => handleDeleteTimeEntry(index)}
                            title="Delete time entry"
                          >
                            ×
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="activity-marker comment-marker" />
                        <div className="activity-content">
                          <div className="activity-text">
                            <strong>{activity.data.createdByName}</strong>
                            {' commented: '}
                            <span className="comment-text">{activity.data.text}</span>
                          </div>
                          <div className="activity-time">
                            {formatTime(activity.timestamp)}
                          </div>
                        </div>
                        {user && user.uid === activity.data.createdBy && (
                          <button
                            className="delete-entry"
                            onClick={() => handleDeleteComment(activity.data.id)}
                            title="Delete comment"
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="task-detail-sidebar">
            {/* Due Date Section */}
            <div className="task-due-date-section">
              <div className="section-title">Due Date</div>
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
              <div className="section-title">Labels</div>
              {user && !showDeleteConfirm && (
                <button 
                  className="add-label-button"
                  onClick={() => setShowLabelForm(!showLabelForm)}
                >
                  {showLabelForm ? 'Cancel' : 'Add Label'}
                </button>
              )}
              
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

            {/* Actions */}
            {user && (
              <div className="task-detail-actions">
                <button 
                  className={`delete-task-button ${showDeleteConfirm ? 'confirm' : ''}`}
                  onClick={handleDelete}
                >
                  {showDeleteConfirm ? 'Click to confirm deletion' : 'Delete'}
                </button>
              </div>
            )}

            {/* Metadata */}
            <div className="task-metadata">
              <div className="metadata-item">
                <span className="metadata-label">Created</span>
                <span>{new Date(task.createdAt?.seconds * 1000 || task.createdAt).toLocaleString()}</span>
              </div>
              {task.createdBy && (
                <div className="metadata-item">
                  <span className="metadata-label">Created by</span>
                  <span>User {task.createdBy.substring(0, 8)}</span>
                </div>
              )}
              <div className="metadata-item">
                <span className="metadata-label">Votes</span>
                <span>{task.votes || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 