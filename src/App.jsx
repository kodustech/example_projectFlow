import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import EmojiPicker from 'emoji-picker-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/Navbar.js';
import { TaskDetail } from './components/TaskDetail.jsx';
import { useKanban } from './hooks/useKanban';
import './App.css';
import { FloatingTimer } from './components/FloatingTimer';

// Time tracking categories
const categories = {
  development: { label: 'Development', color: '#28a745' },
  design: { label: 'Design', color: '#6f42c1' },
  planning: { label: 'Planning', color: '#17a2b8' },
  meeting: { label: 'Meeting', color: '#ffc107' },
  bugfix: { label: 'Bug Fix', color: '#dc3545' },
  other: { label: 'Other', color: '#6c757d' }
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
  const [addingNewColumn, setAddingNewColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

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

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Movendo colunas
    if (type === 'column') {
      console.log('Movendo coluna:', { source, destination });
      
      const orderedColumns = Object.values(columns)
        .sort((a, b) => a.order - b.order);

      const sourceIdx = orderedColumns.findIndex(col => String(col.id) === String(result.draggableId));
      const destinationIdx = destination.index;

      if (sourceIdx === destinationIdx) return;

      const newOrder = [...orderedColumns];
      const [removed] = newOrder.splice(sourceIdx, 1);
      newOrder.splice(destinationIdx, 0, removed);

      const updatedColumns = newOrder.reduce((acc, col, idx) => ({
        ...acc,
        [String(col.id)]: {
          ...col,
          order: idx
        }
      }), {});

      console.log('Atualizando ordem:', updatedColumns);
      await updateColumnsOrder(updatedColumns);
      return;
    }

    // Movendo tasks
    try {
      await moveTask(
        String(source.droppableId),
        String(destination.droppableId),
        String(result.draggableId),
        source.index,
        destination.index
      );
    } catch (error) {
      console.error('Erro ao mover task:', error);
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
    
    const taskId = String(crypto.randomUUID?.() || Date.now() + Math.random());
    
    await addTask(columnId, {
      id: taskId,
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
          <div className="task-text">{task.content}</div>
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
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="subtasks-indicator">
              <span>
                {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
              </span>
              <div className="progress">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
          {task.dependencies && task.dependencies.length > 0 && (
            <div className="task-dependencies">
              {task.dependencies.some(d => d.type === 'BLOCKED_BY') && (
                <span className="blocked-indicator">Blocked</span>
              )}
              <svg className="dependency-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10M7 17L17 7" />
              </svg>
              <span>{task.dependencies.length}</span>
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

  const handleAddColumn = async () => {
    if (!newColumnTitle?.trim()) return;
    
    const columnId = String(crypto.randomUUID?.() || Date.now() + Math.random());
    
    await updateColumn(columnId, {
      title: newColumnTitle.trim(),
      emoji: '',
      color: '#1a73e8',
      order: Object.values(columns).length
    });
    
    setNewColumnTitle('');
    setAddingNewColumn(false);
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className={`app ${showForms ? 'forms-visible' : ''}`}>
      <Navbar onFormsVisibilityChange={setShowForms} />
      
      <TaskDetail
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        onAddLabel={addLabel}
        onRemoveLabel={removeLabel}
        columns={columns}
      />
      
      <FloatingTimer
        isVisible={!!activeTimer && !selectedTask}
        taskTitle={activeTimer?.taskTitle}
        elapsedTime={elapsedTime}
        category={categories[activeTimer?.category || 'other']}
        onStopTracking={handleStopFloatingTimer}
        onOpenTask={handleOpenTimerTask}
      />
      
      {!loading && (
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
                    key={String(column.id)}
                    draggableId={String(column.id)}
                    index={index}
                    isDragDisabled={!user}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`column ${snapshot.isDragging ? 'dragging' : ''}`}
                        style={{
                          ...provided.draggableProps.style,
                          borderTop: `3px solid ${column.color}`
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
                              {column.emoji || '📝'}
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

                        <Droppable 
                          droppableId={String(column.id)} 
                          type="task"
                          key={String(column.id)}
                        >
                          {(provided, snapshot) => (
                            <div
                              className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              {Array.isArray(column.tasks) && column.tasks.map((task, index) => (
                                <Draggable
                                  key={String(task.id)}
                                  draggableId={String(task.id)}
                                  index={index}
                                  isDragDisabled={!user}
                                >
                                  {(provided, snapshot) => renderTask(task, column.id, provided, snapshot)}
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
                {user && (
                  <div className="add-column-wrapper">
                    {addingNewColumn ? (
                      <div className="new-column-form">
                        <input
                          type="text"
                          value={newColumnTitle}
                          onChange={(e) => setNewColumnTitle(e.target.value)}
                          placeholder="Enter list title..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddColumn();
                            } else if (e.key === 'Escape') {
                              setAddingNewColumn(false);
                              setNewColumnTitle('');
                            }
                          }}
                        />
                        <div className="new-column-actions">
                          <button 
                            className="add-column-submit"
                            onClick={handleAddColumn}
                          >
                            Add list
                          </button>
                          <button 
                            className="add-column-cancel"
                            onClick={() => {
                              setAddingNewColumn(false);
                              setNewColumnTitle('');
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="add-column-button"
                        onClick={() => setAddingNewColumn(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add another list
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
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