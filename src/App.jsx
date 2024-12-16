import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './App.css';

const initialColumns = {
  todo: {
    id: 'todo',
    title: 'To Do',
    tasks: []
  }
};

function App() {
  const [columns, setColumns] = useState(initialColumns);
  const [newTask, setNewTask] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    const columnId = newColumnTitle.toLowerCase().replace(/\s+/g, '-');
    
    setColumns({
      ...columns,
      [columnId]: {
        id: columnId,
        title: newColumnTitle,
        tasks: []
      }
    });
    
    setNewColumnTitle('');
  };

  const handleDeleteColumn = (columnId) => {
    const newColumns = { ...columns };
    delete newColumns[columnId];
    setColumns(newColumns);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const task = {
      id: Date.now().toString(),
      content: newTask
    };

    setColumns({
      ...columns,
      todo: {
        ...columns.todo,
        tasks: [...columns.todo.tasks, task]
      }
    });
    setNewTask('');
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

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

  return (
    <div className="app">
      <h1>Kanban Board</h1>
      
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
        <div className="board">
          {Object.values(columns).map(column => (
            <div key={column.id} className="column">
              <div className="column-header">
                <h2>{column.title}</h2>
                <button 
                  className="delete-column"
                  onClick={() => handleDeleteColumn(column.id)}
                >
                  ×
                </button>
              </div>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="task-list"
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="task"
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
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default App; 