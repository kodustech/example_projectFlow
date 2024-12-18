import React from 'react';
import { formatDuration } from '../utils/timeUtils';

export function FloatingTimer({ 
  isVisible, 
  taskTitle, 
  elapsedTime, 
  category,
  onStopTracking,
  onOpenTask
}) {
  if (!isVisible) return null;

  return (
    <div className="floating-timer" onClick={onOpenTask}>
      <div className="timer-content">
        <div className="timer-task">
          <div className="timer-category" style={{ backgroundColor: category.color }} />
          <span className="task-title">{taskTitle}</span>
        </div>
        <div className="timer-time">{formatDuration(elapsedTime)}</div>
      </div>
      <button 
        className="stop-timer" 
        onClick={(e) => {
          e.stopPropagation();
          onStopTracking();
        }}
        title="Stop tracking"
      >
        ⏹️
      </button>
    </div>
  );
} 