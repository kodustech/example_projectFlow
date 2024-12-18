import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import EmojiPicker from 'emoji-picker-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/Navbar';
import { TaskDetail } from './components/TaskDetail';
import { useKanban } from './hooks/useKanban';
import './App.css';
import { FloatingTimer } from './components/FloatingTimer';
import { Filters } from './components/Filters';

// Time tracking categories
const categories = {
  development: { label: 'Development', color: '#28a745' },
  design: { label: 'Design', color: '#6f42c1' },
  planning: { label: 'Planning', color: '#17a2b8' },
  meeting: { label: 'Meeting', color: '#ffc107' },
  bugfix: { label: 'Bug Fix', color: '#dc3545' },
  other: { label: 'Other', color: '#6c757d' }
};

// Priority levels configuration
const priorityLevels = {
  HIGH: { label: 'High', color: '#dc3545', icon: '🔴' },
  MEDIUM: { label: 'Medium', color: '#ffc107', icon: '🟡' },
  LOW: { label: 'Low', color: '#28a745', icon: '🟢' }
};

function KanbanBoard() {
  const { user } = useAuth();
  const { 
    columns, 
    loading, 
    updateColumn, 
    deleteColumn, 
    updateColumnsOrder,
    moveTask,
    voteTask,
    hasVoted,
    updateTask,
    deleteTask,
    addTask,
    addLabel,
    removeLabel
  } = useKanban();
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [showForms, setShowForms] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const emojiPickerRef = useRef(null);
  const [addingTaskToColumn, setAddingTaskToColumn] = useState(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeFilters, setActiveFilters] = useState({
    priority: [],
    labels: [],
    dueDate: {
      from: null,
      to: null
    },
    overdue: false,
    hasNoDate: false
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(null);
        setShowColorPicker(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const activeTask = Object.values(columns).reduce((found, column) => {
      if (found) return found;
      return column.tasks?.find(task => task.timeEntries?.some(entry => entry.ongoing));
    }, null);

    if (activeTask) {
      const ongoingEntry = activeTask.timeEntries.find(entry => entry.ongoing);
      setActiveTimer({
        taskId: activeTask.id,
        taskTitle: activeTask.content,
        category: ongoingEntry.category,
        startTime: ongoingEntry.startTime,
        columnId: Object.entries(columns).find(([_, col]) => 
          col.tasks?.some(t => t.id === activeTask.id)
        )?.[0]
      });
    } else {
      setActiveTimer(null);
    }
  }, [columns]);

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - activeTimer.startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const onDragEnd = async (result) => {
    if (!user) return;
    
    const { source, destination, type } = result;
    
    if (!destination) return;

    // Verificar se as colunas existem
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];

    if (!sourceColumn || !destColumn) {
      console.error('Colunas não encontradas:', { source: source.droppableId, destination: destination.droppableId });
      return;
    }

    if (type === 'column') {
      const orderedColumns = Object.values(columns)
        .sort((a, b) => a.order - b.order);

      const sourceIdx = orderedColumns.findIndex(col => col.id === result.draggableId);
      const destinationIdx = destination.index;

      if (sourceIdx === destinationIdx) return;

      const newOrder = [...orderedColumns];
      const [removed] = newOrder.splice(sourceIdx, 1);
      newOrder.splice(destinationIdx, 0, removed);

      const updatedColumns = newOrder.reduce((acc, col, idx) => ({
        ...acc,
        [col.id]: {
          ...col,
          order: idx
        }
      }), {});

      await updateColumnsOrder(updatedColumns);
      return;
    }

    // Move task between columns
    const taskToMove = sourceColumn.tasks?.[source.index];

    if (!taskToMove) {
      console.error('Task não encontrada:', { sourceIndex: source.index });
      return;
    }

    const newSourceTasks = Array.from(sourceColumn.tasks || []);
    newSourceTasks.splice(source.index, 1);

    const newDestTasks = Array.from(destColumn.tasks || []);
    newDestTasks.splice(destination.index, 0, taskToMove);

    // Atualizar o estado local antes da chamada à API
    const updatedColumns = {
      ...columns,
      [sourceColumn.id]: {
        ...sourceColumn,
        tasks: newSourceTasks
      },
      [destColumn.id]: {
        ...destColumn,
        tasks: newDestTasks
      }
    };

    try {
      await moveTask(
        source.droppableId,
        destination.droppableId,
        taskToMove.id,
        source.index,
        destination.index
      );
    } catch (error) {
      console.error('Erro ao mover task:', error);
      // Em caso de erro, você pode querer reverter o estado local
    }
  };

  const handleEmojiClick = async (columnId, emojiObject) => {
    if (!user) return;
    await updateColumn(columnId, {
      emoji: emojiObject.emoji
    });
    setShowEmojiPicker(null);
  };

  const handleColorChange = async (columnId, color) => {
    if (!user) return;
    await updateColumn(columnId, {
      color: color
    });
    setShowColorPicker(null);
  };

  const getDueDateColor = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '#dc3545'; // red for overdue
    if (diffDays <= 3) return '#ffc107'; // yellow for soon
    return '#28a745'; // green for future
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return '';
    return new Date(dueDate).toLocaleDateString();
  };

  const handleTaskUpdate = async (taskId, updates) => {
    if (!selectedTask?.columnId) return;
    await updateTask(selectedTask.columnId, taskId, updates);
    setSelectedTask(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleTaskDelete = async (taskId) => {
    if (!selectedTask?.columnId) return;
    await deleteTask(selectedTask.columnId, taskId);
  };

  const handleAddTask = async (columnId) => {
    if (!newTaskContent?.trim()) return;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Default to 1 week from now
    
    await addTask(columnId, {
      id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
      content: newTaskContent.trim(),
      createdAt: dueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      labels: []
    });
    
    setNewTaskContent('');
    setAddingTaskToColumn(null);
  };

  const orderedColumns = Object.values(columns)
    .sort((a, b) => a.order - b.order);

  const handleTaskClick = useCallback((columnId, task, isDragging) => {
    if (isDragging) return;
    setSelectedTask({ ...task, columnId });
  }, []);

  const handleTaskClickMemoized = useCallback((columnId, task, isDragging) => {
    handleTaskClick(columnId, task, isDragging);
  }, [handleTaskClick]);

  const renderTask = useCallback((task, columnId, provided, snapshot) => {
    const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
    const dueDateColor = getDueDateColor(taskDueDate);
    
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`task ${snapshot.isDragging ? 'dragging' : ''}`}
        onClick={() => handleTaskClickMemoized(columnId, task, snapshot.isDragging)}
      >
        <div className="task-content">
          {task.content}
          {task.priority && (
            <span className={`priority-indicator priority-${task.priority}`}>
              {task.priority}
            </span>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="task-labels">
              {task.labels.map((label, index) => (
                <span
                  key={index}
                  className="task-label"
                  style={{ backgroundColor: label.color }}
                >
                  {label.text}
                </span>
              ))}
            </div>
          )}
          {taskDueDate && (
            <div className="task-due-date" style={{ color: dueDateColor }}>
              {formatDueDate(taskDueDate)}
            </div>
          )}
        </div>
        <div className="task-footer">
          <div className="task-votes">
            <button
              className={`vote-button ${hasVoted(task.id) ? 'voted' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                voteTask(task.id);
              }}
            >
              ⭐️ {task.votes?.length || 0}
            </button>
          </div>
        </div>
      </div>
    );
  }, [handleTaskClickMemoized, voteTask, hasVoted, getDueDateColor, formatDueDate]);

  const handleStopFloatingTimer = () => {
    if (activeTimer) {
      const task = columns[activeTimer.columnId]?.tasks?.find(t => t.id === activeTimer.taskId);
      if (task) {
        const entries = task.timeEntries || [];
        const currentEntry = entries.find(entry => entry.ongoing);
        
        if (currentEntry) {
          const updatedEntries = entries.filter(e => !e.ongoing);
          updatedEntries.push({
            ...currentEntry,
            endTime: Date.now(),
            duration: Date.now() - currentEntry.startTime,
            ongoing: false
          });
          
          updateTask(activeTimer.columnId, activeTimer.taskId, { 
            timeEntries: updatedEntries 
          });
        }
      }
    }
  };

  const handleOpenTimerTask = () => {
    if (activeTimer) {
      const task = columns[activeTimer.columnId]?.tasks?.find(t => t.id === activeTimer.taskId);
      if (task) {
        setSelectedTask({ ...task, columnId: activeTimer.columnId });
      }
    }
  };

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
  };

  const filterTasks = (tasks) => {
    if (!tasks) return [];
    
    return tasks.filter(task => {
      // Priority filter
      if (activeFilters.priority.length > 0 && !activeFilters.priority.includes(task.priority)) {
        return false;
      }

      // Labels filter
      if (activeFilters.labels.length > 0) {
        const taskLabelIds = task.labels?.map(l => l.id) || [];
        if (!activeFilters.labels.some(labelId => taskLabelIds.includes(labelId))) {
          return false;
        }
      }

      // Due date filter
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Overdue filter
        if (activeFilters.overdue) {
          if (dueDate >= today) {
            return false;
          }
        }

        // Date range filter
        if (activeFilters.dueDate.from) {
          const fromDate = new Date(activeFilters.dueDate.from);
          fromDate.setHours(0, 0, 0, 0);
          if (dueDate < fromDate) {
            return false;
          }
        }

        if (activeFilters.dueDate.to) {
          const toDate = new Date(activeFilters.dueDate.to);
          toDate.setHours(23, 59, 59, 999);
          if (dueDate > toDate) {
            return false;
          }
        }
      } else if (activeFilters.hasNoDate) {
        return true;
      } else if (activeFilters.overdue || activeFilters.dueDate.from || activeFilters.dueDate.to) {
        return false;
      }

      return true;
    });
  };

  // Get all unique labels from all tasks
  const getAllLabels = () => {
    const labelsSet = new Set();
    Object.values(columns).forEach(column => {
      column.tasks?.forEach(task => {
        task.labels?.forEach(label => {
          labelsSet.add(JSON.stringify(label));
        });
      });
    });
    return Array.from(labelsSet).map(label => JSON.parse(label));
  };

  const getPriorityStyle = (priority) => {
    if (!priority) return {};
    return {
      borderLeft: `4px solid ${priorityLevels[priority]?.color || 'transparent'}`
    };
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className={`app ${showForms ? 'forms-visible' : ''}`}>
      <Navbar onFormsVisibilityChange={setShowForms} />
      
      <Filters 
        onFilterChange={handleFilterChange}
        labels={getAllLabels()}
      />

      <TaskDetail
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        onAddLabel={addLabel}
        onRemoveLabel={removeLabel}
      />
      
      <FloatingTimer
        isVisible={!!activeTimer && !selectedTask}
        taskTitle={activeTimer?.taskTitle}
        elapsedTime={elapsedTime}
        category={categories[activeTimer?.category || 'other']}
        onStopTracking={handleStopFloatingTimer}
        onOpenTask={handleOpenTimerTask}
      />
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="column" direction="horizontal">
          {(provided) => (
            <div 
              className="board"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {orderedColumns.map((column, index) => (
                <Draggable 
                  key={column.id} 
                  draggableId={column.id} 
                  index={index}
                  isDragDisabled={!user}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="column"
                      style={{
                        ...provided.draggableProps.style,
                        borderTop: `3px solid ${column.color || '#dee2e6'}`
                      }}
                    >
                      <div 
                        className="column-header"
                        {...provided.dragHandleProps}
                      >
                        <div className="column-header-left">
                          <span 
                            className="column-emoji"
                            onClick={() => user && setShowEmojiPicker(column.id)}
                            style={{ cursor: user ? 'pointer' : 'default' }}
                          >
                            {column.emoji}
                          </span>
                          <h2>{column.title}</h2>
                        </div>
                        {user && (
                          <div className="column-header-right">
                            <button 
                              className="color-picker-button"
                              onClick={() => setShowColorPicker(column.id)}
                              style={{ backgroundColor: column.color }}
                            />
                            <button 
                              className="delete-column"
                              onClick={() => deleteColumn(column.id)}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>

                      {showEmojiPicker === column.id && (
                        <div className="emoji-picker-container" ref={emojiPickerRef}>
                          <EmojiPicker
                            onEmojiClick={(emojiObject) => handleEmojiClick(column.id, emojiObject)}
                            width={300}
                          />
                        </div>
                      )}

                      {showColorPicker === column.id && (
                        <div className="color-picker-container" ref={emojiPickerRef}>
                          <div className="color-options">
                            {['#1a73e8', '#dc3545', '#28a745', '#ffc107', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'].map(color => (
                              <button
                                key={color}
                                className="color-option"
                                style={{ backgroundColor: color }}
                                onClick={() => handleColorChange(column.id, color)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <Droppable droppableId={column.id} type="task">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                          >
                            {filterTasks(column.tasks || [])?.map((task, index) => (
                              <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                                isDragDisabled={!user}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`task ${snapshot.isDragging ? 'dragging' : ''}`}
                                    style={{
                                      ...provided.draggableProps.style,
                                      ...getPriorityStyle(task.priority)
                                    }}
                                    onClick={(e) => handleTaskClickMemoized(column.id, task, snapshot.isDragging)}
                                  >
                                    <div className="task-content">
                                      <div className="task-text">{task.content}</div>
                                      {task.dueDate && (
                                        <div 
                                          className="task-due-date"
                                          style={{ 
                                            color: getDueDateColor(task.dueDate),
                                            fontSize: '0.8em',
                                            marginTop: '4px'
                                          }}
                                        >
                                          📅 {formatDueDate(task.dueDate)}
                                        </div>
                                      )}
                                      {task.labels && task.labels.length > 0 && (
                                        <div className="task-labels">
                                          {task.labels.map(label => (
                                            <span
                                              key={label.id}
                                              className="task-label"
                                              style={{ backgroundColor: label.color }}
                                              title={label.text}
                                            >
                                              {label.text}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="task-footer">
                                      <div className="task-votes">
                                        <button
                                          className={`vote-button ${hasVoted(task.id) ? 'voted' : ''}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            voteTask(column.id, task.id);
                                          }}
                                          title={hasVoted(task.id) ? 'Remover voto' : 'Votar'}
                                        >
                                          ⭐️ {task.votes || 0}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {user && (
                              <div className="add-task-button-container">
                                {addingTaskToColumn === column.id ? (
                                  <div className="inline-task-form">
                                    <textarea
                                      value={newTaskContent}
                                      onChange={(e) => setNewTaskContent(e.target.value)}
                                      placeholder="Enter a title for this card..."
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleAddTask(column.id);
                                        } else if (e.key === 'Escape') {
                                          setAddingTaskToColumn(null);
                                          setNewTaskContent('');
                                        }
                                      }}
                                    />
                                    <div className="inline-form-actions">
                                      <button
                                        className="inline-form-submit"
                                        onClick={() => handleAddTask(column.id)}
                                      >
                                        Add card
                                      </button>
                                      <button
                                        className="inline-form-cancel"
                                        onClick={() => {
                                          setAddingTaskToColumn(null);
                                          setNewTaskContent('');
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    className="add-task-button"
                                    onClick={() => setAddingTaskToColumn(column.id)}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add a card
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <KanbanBoard />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App; 