import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import EmojiPicker from 'emoji-picker-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/Navbar';
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
    addTask, 
    moveTask 
  } = useKanban();
  
  const [newTask, setNewTask] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const emojiPickerRef = useRef(null);

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

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!user || !newColumnTitle.trim()) return;

    const columnId = newColumnTitle.toLowerCase().replace(/\s+/g, '-');
    const maxOrder = Math.max(...Object.values(columns).map(col => col.order), -1);
    
    await updateColumn(columnId, {
      id: columnId,
      title: newColumnTitle,
      tasks: [],
      order: maxOrder + 1,
      emoji: '📝',
      color: '#1a73e8'
    });
    
    setNewColumnTitle('');
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!user || !newTask.trim()) return;

    const task = {
      id: Date.now().toString(),
      content: newTask,
      createdAt: new Date()
    };

    const firstColumnId = Object.values(columns)
      .sort((a, b) => a.order - b.order)[0]?.id;

    if (firstColumnId) {
      await addTask(firstColumnId, task);
      setNewTask('');
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (!user) return;
    await deleteColumn(columnId);
  };

  const onDragEnd = async (result) => {
    if (!user) return;
    
    const { source, destination, type } = result;
    
    if (!destination) return;

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

  const orderedColumns = Object.values(columns)
    .sort((a, b) => a.order - b.order);

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="app">
      <Navbar />
      
      {user && (
        <div className="forms-container">
          <form onSubmit={handleAddTask} className="task-form">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task"
            />
            <button type="submit">Add Task</button>
          </form>

          <form onSubmit={handleAddColumn} className="column-form">
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="Add a new column"
            />
            <button type="submit">Add Column</button>
          </form>
        </div>
      )}

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
                              onClick={() => handleDeleteColumn(column.id)}
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
                                    {...(user ? provided.dragHandleProps : {})}
                                    className={`task ${snapshot.isDragging ? 'dragging' : ''}`}
                                    style={{
                                      ...provided.draggableProps.style,
                                      cursor: user ? 'grab' : 'default'
                                    }}
                                  >
                                    {task.content}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
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