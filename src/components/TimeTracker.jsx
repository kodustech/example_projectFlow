import React, { useState, useEffect } from 'react';
import { formatDuration } from '../utils/timeUtils';

export function TimeTracker({ 
  timeEntries, 
  isTracking, 
  onStartTracking, 
  onStopTracking, 
  onUpdateEntry,
  onDeleteEntry 
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
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

  // Update elapsed time for ongoing tracking
  useEffect(() => {
    let interval;
    if (isTracking) {
      const currentEntry = timeEntries[timeEntries.length - 1];
      interval = setInterval(() => {
        if (currentEntry?.startTime) {
          setElapsedTime(Date.now() - currentEntry.startTime);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, timeEntries]);

  const handleStartTracking = () => {
    onStartTracking({
      category: selectedCategory,
      startTime: Date.now(),
      ongoing: true
    });
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

  const sortedEntries = [...timeEntries].sort((a, b) => b.startTime - a.startTime);

  return (
    <div className="time-tracker">
      <div className="tracker-header">
        <div className="tracker-title">
          <h3>Activity</h3>
          {isTracking && (
            <div className="elapsed-time">
              {formatDuration(elapsedTime)}
            </div>
          )}
        </div>
        
        <div className="tracker-controls">
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
            onClick={isTracking ? onStopTracking : handleStartTracking}
          >
            {isTracking ? 'Stop' : 'Start Tracking'}
          </button>
        </div>
      </div>

      <div className="activity-log">
        {sortedEntries.map((entry, index) => (
          <div key={index} className="activity-item">
            <div className="activity-marker" style={{ backgroundColor: categories[entry.category || 'other'].color }} />
            <div className="activity-content">
              <div className="activity-text">
                <strong>{categories[entry.category || 'other'].label}</strong>
                {' - '}
                {entry.ongoing ? (
                  <span className="ongoing">Tracking now...</span>
                ) : (
                  <span>{formatDuration(entry.duration)}</span>
                )}
              </div>
              <div className="activity-time">
                {formatTime(entry.startTime)}
              </div>
            </div>
            {!entry.ongoing && (
              <button
                className="delete-entry"
                onClick={() => onDeleteEntry(index)}
                title="Delete entry"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 