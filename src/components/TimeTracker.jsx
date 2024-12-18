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

  const handleEditEntry = (entryIndex, updates) => {
    const entry = timeEntries[entryIndex];
    onUpdateEntry(entryIndex, {
      ...entry,
      ...updates,
      duration: updates.endTime ? updates.endTime - entry.startTime : entry.duration
    });
  };

  const getTotalDuration = () => {
    return timeEntries.reduce((total, entry) => {
      if (entry.ongoing) {
        return total + (Date.now() - entry.startTime);
      }
      return total + (entry.duration || 0);
    }, 0);
  };

  const getDurationByCategory = () => {
    const categoryDurations = {};
    timeEntries.forEach(entry => {
      const category = entry.category || 'other';
      const duration = entry.ongoing ? 
        (Date.now() - entry.startTime) : 
        (entry.duration || 0);
      
      categoryDurations[category] = (categoryDurations[category] || 0) + duration;
    });
    return categoryDurations;
  };

  return (
    <div className="time-tracker">
      <div className="time-tracker-header">
        <div className="current-time">
          {isTracking && (
            <div className="elapsed-time">
              {formatDuration(elapsedTime)}
            </div>
          )}
        </div>
        
        <div className="tracking-controls">
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
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>
      </div>

      <div className="time-summary">
        <h4>Total Time: {formatDuration(getTotalDuration())}</h4>
        <div className="category-summary">
          {Object.entries(getDurationByCategory()).map(([category, duration]) => (
            <div 
              key={category} 
              className="category-item"
              style={{ 
                backgroundColor: categories[category]?.color || categories.other.color,
                opacity: 0.9
              }}
            >
              <span className="category-label">{categories[category]?.label || 'Other'}</span>
              <span className="category-duration">{formatDuration(duration)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="time-entries">
        <h4>Time Entries</h4>
        {timeEntries.map((entry, index) => (
          <div key={index} className="time-entry">
            <div className="entry-header">
              <span 
                className="entry-category"
                style={{ 
                  backgroundColor: categories[entry.category || 'other']?.color || categories.other.color 
                }}
              >
                {categories[entry.category || 'other']?.label || 'Other'}
              </span>
              <span className="entry-date">
                {new Date(entry.startTime).toLocaleDateString()}
              </span>
            </div>
            
            <div className="entry-times">
              <div className="time-input-group">
                <label>Start:</label>
                <input
                  type="datetime-local"
                  value={new Date(entry.startTime).toISOString().slice(0, 16)}
                  onChange={(e) => handleEditEntry(index, { 
                    startTime: new Date(e.target.value).getTime() 
                  })}
                  disabled={entry.ongoing}
                />
              </div>
              
              {!entry.ongoing && (
                <div className="time-input-group">
                  <label>End:</label>
                  <input
                    type="datetime-local"
                    value={new Date(entry.endTime).toISOString().slice(0, 16)}
                    onChange={(e) => handleEditEntry(index, { 
                      endTime: new Date(e.target.value).getTime() 
                    })}
                  />
                </div>
              )}
              
              <span className="entry-duration">
                {entry.ongoing ? 'Ongoing...' : formatDuration(entry.duration)}
              </span>
              
              {!entry.ongoing && (
                <button
                  className="delete-entry-button"
                  onClick={() => onDeleteEntry(index)}
                  title="Delete entry"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 