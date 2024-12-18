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

  const handleTaskClick = (columnId, task) => {
    setSelectedTask({ ...task, columnId });
  };

  const handleTaskClickMemoized = useCallback((columnId, task, isDragging) => {
    if (!isDragging) {
      handleTaskClick(columnId, task);
    }
  }, []);

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

  const onDragEnd = async (result) => {
    if (!user) return;
    
    const { source, destination, type } = result;
    
    if (!destination) return;

    if (!columns[source.droppableId] || !columns[destination.droppableId]) {
      console.error('Colunas não encontradas');
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

    await moveTask(
      source.droppableId,
      destination.droppableId,
      result.draggableId,
      source.index,
      destination.index
    );
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

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className={`app ${showForms ? 'forms-visible' : ''}`}>
      <Navbar onFormsVisibilityChange={setShowForms} />
      
      <TaskDetail
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => {
          console.log('Fechando modal');
          setSelectedTask(null);
        }}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        onAddLabel={(taskId, label) => {
          console.log('Chamando addLabel com:', { taskId, label, columnId: selectedTask?.columnId });
          if (selectedTask?.columnId) {
            addLabel(selectedTask.columnId, taskId, label);
          }
        }}
        onRemoveLabel={(taskId, labelId) => {
          console.log('Chamando removeLabel com:', { taskId, labelId, columnId: selectedTask?.columnId });
          if (selectedTask?.columnId) {
            removeLabel(selectedTask.columnId, taskId, labelId);
          }
        }}
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
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="column"
                      style={{
                        ...provided.draggableProps.style,
                        borderTop: `3px solid ${column.color}`
                      }}
                    >
                      <div 
                        className="column-header"
                        {...(user ? provided.dragHandleProps : {})}
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
                            className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {column.tasks?.map((task, index) => (
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
                                    }}
                                    onClick={(e) => handleTaskClickMemoized(column.id, task, snapshot.isDragging)}
                                  >
                                    {user && (
                                      <div
                                        className="task-drag-handle"
                                        title="Arrastar task"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h8M8 15h8" />
                                        </svg>
                                      </div>
                                    )}
                                    <div 
                                      className="task-content"
                                    >
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
                                    <div 
                                      className="task-vote"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      <button
                                        className={`vote-button ${hasVoted(task.id) ? 'voted' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          voteTask(column.id, task.id);
                                        }}
                                        title={hasVoted(task.id) ? 'Remover voto' : 'Votar'}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                      </button>
                                      <span className="vote-count">{task.votes || 0}</span>
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