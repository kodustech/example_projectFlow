import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './App.css';

const initialColumns = {
  todo: {
    id: 'todo',
    title: 'To Do',
    tasks: [],
    order: 0
  }
};

function App() {
  const [columns, setColumns] = useState(initialColumns);
  const [newTask, setNewTask] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [boardTitle, setBoardTitle] = useState('Kanban Board');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e) => {
    setBoardTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (!boardTitle.trim()) {
      setBoardTitle('Kanban Board');
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    const columnId = newColumnTitle.toLowerCase().replace(/\s+/g, '-');
    const maxOrder = Math.max(...Object.values(columns).map(col => col.order), -1);
    
    setColumns({
      ...columns,
      [columnId]: {
        id: columnId,
        title: newColumnTitle,
        tasks: [],
        order: maxOrder + 1
      }
    });
    
    setNewColumnTitle('');
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const task = {
      id: Date.now().toString(),
      content: newTask
    };

    const firstColumnId = Object.values(columns)
      .sort((a, b) => a.order - b.order)[0]?.id;

    if (firstColumnId) {
      setColumns({
        ...columns,
        [firstColumnId]: {
          ...columns[firstColumnId],
          tasks: [...columns[firstColumnId].tasks, task]
        }
      });
    }
    setNewTask('');
  };

  const handleDeleteColumn = (columnId) => {
    const newColumns = { ...columns };
    delete newColumns[columnId];
    setColumns(newColumns);
  };

  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    
    if (!destination) return;

    // Se for arrasto de colunas
    if (type === 'column') {
      const orderedColumns = Object.values(columns)
        .sort((a, b) => a.order - b.order);

      const sourceIdx = orderedColumns.findIndex(col => col.id === result.draggableId);
      const destinationIdx = destination.index;

      if (sourceIdx === destinationIdx) return;

      const newOrder = [...orderedColumns];
      const [removed] = newOrder.splice(sourceIdx, 1);
      newOrder.splice(destinationIdx, 0, removed);

      // Atualiza a ordem de todas as colunas
      const updatedColumns = newOrder.reduce((acc, col, idx) => ({
        ...acc,
        [col.id]: {
          ...col,
          order: idx
        }
      }), {});

      setColumns(updatedColumns);
      return;
    }

    // Se for arrasto de tarefas
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const sourceTasks = [...sourceColumn.tasks];
    const destTasks = source.droppableId === destination.droppableId 
      ? sourceTasks 
      : [...destColumn.tasks];

    const [removed] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, removed);

    setColumns({
      ...columns,
      [source.droppableId]: {
        ...sourceColumn,
        tasks: sourceTasks
      },
      [destination.droppableId]: {
        ...destColumn,
        tasks: destTasks
      }
    });
  };

  const orderedColumns = Object.values(columns)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="app">
      {isEditingTitle ? (
        <input
          ref={titleInputRef}
          type="text"
          value={boardTitle}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          className="board-title-input"
        />
      ) : (
        <h1 
          onClick={handleTitleClick}
          className="board-title"
        >
          {boardTitle}
        </h1>
      )}
      
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
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="column"
                    >
                      <div 
                        className="column-header"
                        {...provided.dragHandleProps}
                      >
                        <h2>{column.title}</h2>
                        <button 
                          className="delete-column"
                          onClick={() => handleDeleteColumn(column.id)}
                        >
                          ×
                        </button>
                      </div>
                      
                      <Droppable droppableId={column.id} type="task">
                        {(provided, snapshot) => (
                          <div
                            className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {column.tasks.map((task, index) => (
                              <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`task ${snapshot.isDragging ? 'dragging' : ''}`}
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

export default App; 