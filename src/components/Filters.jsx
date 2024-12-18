import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './Filters.css';

const PRIORITY_LEVELS = {
  HIGH: { label: 'High', icon: '🔴' },
  MEDIUM: { label: 'Medium', icon: '🟡' },
  LOW: { label: 'Low', icon: '🟢' }
};

export function Filters({ onFilterChange, labels = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    priority: [],
    labels: [],
    dueDate: {
      from: null,
      to: null
    },
    overdue: false,
    hasNoDate: false
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const togglePriority = (priority) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];
    
    handleFilterChange({
      ...filters,
      priority: newPriorities
    });
  };

  const toggleLabel = (labelId) => {
    const newLabels = filters.labels.includes(labelId)
      ? filters.labels.filter(l => l !== labelId)
      : [...filters.labels, labelId];
    
    handleFilterChange({
      ...filters,
      labels: newLabels
    });
  };

  const handleDateChange = (key, date) => {
    handleFilterChange({
      ...filters,
      dueDate: {
        ...filters.dueDate,
        [key]: date
      }
    });
  };

  const clearFilters = () => {
    const clearedFilters = {
      priority: [],
      labels: [],
      dueDate: {
        from: null,
        to: null
      },
      overdue: false,
      hasNoDate: false
    };
    handleFilterChange(clearedFilters);
  };

  const hasActiveFilters = () => {
    return filters.priority.length > 0 ||
           filters.labels.length > 0 ||
           filters.dueDate.from ||
           filters.dueDate.to ||
           filters.overdue ||
           filters.hasNoDate;
  };

  return (
    <div className="filters-container">
      <button 
        className={`filters-toggle ${hasActiveFilters() ? 'has-filters' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="filter-icon">🔍</span>
        Filtros
        {hasActiveFilters() && (
          <span className="filter-badge">
            {filters.priority.length + filters.labels.length + 
             (filters.dueDate.from ? 1 : 0) + (filters.dueDate.to ? 1 : 0) +
             (filters.overdue ? 1 : 0) + (filters.hasNoDate ? 1 : 0)}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="filters-panel">
          <div className="filters-section">
            <h3>Prioridade</h3>
            <div className="priority-filters">
              {Object.entries(PRIORITY_LEVELS).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  className={`priority-filter ${filters.priority.includes(key) ? 'active' : ''}`}
                  onClick={() => togglePriority(key)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {labels.length > 0 && (
            <div className="filters-section">
              <h3>Labels</h3>
              <div className="label-filters">
                {labels.map(label => (
                  <button
                    key={label.id}
                    className={`label-filter ${filters.labels.includes(label.id) ? 'active' : ''}`}
                    style={{ backgroundColor: label.color }}
                    onClick={() => toggleLabel(label.id)}
                  >
                    {label.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filters-section">
            <h3>Data de Entrega</h3>
            <div className="date-filters">
              <div className="date-range">
                <DatePicker
                  selected={filters.dueDate.from}
                  onChange={(date) => handleDateChange('from', date)}
                  selectsStart
                  startDate={filters.dueDate.from}
                  endDate={filters.dueDate.to}
                  placeholderText="Data inicial"
                  className="date-picker"
                  isClearable
                />
                <DatePicker
                  selected={filters.dueDate.to}
                  onChange={(date) => handleDateChange('to', date)}
                  selectsEnd
                  startDate={filters.dueDate.from}
                  endDate={filters.dueDate.to}
                  placeholderText="Data final"
                  className="date-picker"
                  isClearable
                />
              </div>
              <div className="date-options">
                <label>
                  <input
                    type="checkbox"
                    checked={filters.overdue}
                    onChange={(e) => handleFilterChange({
                      ...filters,
                      overdue: e.target.checked
                    })}
                  />
                  Atrasadas
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.hasNoDate}
                    onChange={(e) => handleFilterChange({
                      ...filters,
                      hasNoDate: e.target.checked
                    })}
                  />
                  Sem data
                </label>
              </div>
            </div>
          </div>

          <div className="filters-actions">
            <button 
              className="clear-filters"
              onClick={clearFilters}
              disabled={!hasActiveFilters()}
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 