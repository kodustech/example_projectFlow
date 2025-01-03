import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export function useKanban() {
  const [columns, setColumns] = useState({});
  const [boardTitle, setBoardTitle] = useState('Kanban Board');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Escuta mudanças nas colunas e no título
  useEffect(() => {
    const boardRef = doc(db, 'boards/main');
    const columnsRef = collection(boardRef, 'columns');
    const q = query(columnsRef, orderBy('order'));
    
    // Carregar título inicial
    getDoc(boardRef).then((doc) => {
      if (doc.exists() && doc.data().title) {
        setBoardTitle(doc.data().title);
      }
    });

    // Escutar mudanças no título
    const unsubscribeBoard = onSnapshot(boardRef, (doc) => {
      if (doc.exists() && doc.data().title) {
        setBoardTitle(doc.data().title);
      }
    });

    // Escutar mudanças nas colunas
    const unsubscribeColumns = onSnapshot(q, (snapshot) => {
      const newColumns = {};
      snapshot.forEach((doc) => {
        const columnId = String(doc.id);
        const columnData = doc.data();
        
        // Ensure tasks is always an array and all IDs are strings
        const tasks = Array.isArray(columnData.tasks) 
          ? columnData.tasks.map(task => ({
              ...task,
              id: String(task.id || crypto.randomUUID())
            }))
          : [];

        newColumns[columnId] = {
          id: columnId,
          ...columnData,
          tasks
        };
      });
      setColumns(newColumns);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    });

    return () => {
      unsubscribeBoard();
      unsubscribeColumns();
    };
  }, []);

  // Atualiza o título do board
  const updateBoardTitle = async (newTitle) => {
    if (!user) return;
    
    try {
      await setDoc(doc(db, 'boards/main'), {
        title: newTitle,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Erro ao atualizar título do board:', error);
    }
  };

  // Adiciona ou atualiza uma coluna
  const updateColumn = async (columnId, columnData) => {
    if (!user) return;
    
    try {
      await setDoc(
        doc(db, 'boards/main/columns', columnId),
        { ...columnData, updatedAt: new Date() },
        { merge: true }
      );
    } catch (error) {
      console.error('Erro ao atualizar coluna:', error);
    }
  };

  // Remove uma coluna
  const deleteColumn = async (columnId) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'boards/main/columns', columnId));
    } catch (error) {
      console.error('Erro ao deletar coluna:', error);
    }
  };

  // Atualiza a ordem das colunas
  const updateColumnsOrder = async (newColumns) => {
    if (!user) return;
    
    try {
      const batch = writeBatch(db);
      
      // Converte o objeto em array e ordena pelo índice
      const columnsArray = Object.entries(newColumns).map(([id, column]) => ({
        id,
        ...column
      }));

      // Atualiza a ordem de cada coluna
      columnsArray.forEach((column, index) => {
        const columnRef = doc(db, 'boards/main/columns', column.id);
        batch.update(columnRef, { 
          order: index,
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      console.log('Ordem das colunas atualizada:', columnsArray.map(c => ({ id: c.id, order: c.order })));
    } catch (error) {
      console.error('Erro ao atualizar ordem das colunas:', error);
    }
  };

  // Adiciona uma nova task
  const addTask = async (columnId, taskData) => {
    if (!user) return;
    
    try {
      console.log('Tentando adicionar task na coluna:', columnId);
      console.log('Colunas disponíveis:', Object.keys(columns));
      
      const column = columns[String(columnId)];
      if (!column) {
        console.error('Coluna não encontrada:', columnId);
        return;
      }

      // Ensure task ID is a string from the start
      const taskId = String(taskData.id || crypto.randomUUID());
      
      const taskWithVotes = {
        ...taskData,
        id: taskId,
        votes: 0,
        votedBy: [],
        labels: [],
        createdBy: user.uid,
        createdAt: new Date()
      };

      console.log('Adicionando task:', taskWithVotes);
      const updatedTasks = [...(column.tasks || []), taskWithVotes];
      await updateColumn(String(columnId), { tasks: updatedTasks });
      console.log('Task adicionada com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar task:', error);
    }
  };

  // Vota em uma task
  const voteTask = async (columnId, taskId) => {
    try {
      const column = columns[columnId];
      if (!column) return;

      const taskIndex = column.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const task = column.tasks[taskIndex];
      const voterId = user ? user.uid : getVisitorId();
      
      // Garante que a task tenha as propriedades necessárias
      if (!task.votedBy) {
        task.votedBy = [];
      }
      if (typeof task.votes !== 'number') {
        task.votes = 0;
      }
      
      // Verifica se o usuário já votou
      if (task.votedBy.includes(voterId)) {
        if (user) {
          // Usuários logados podem remover seu voto
          const updatedTask = {
            ...task,
            votes: Math.max(0, task.votes - 1), // Garante que não fique negativo
            votedBy: task.votedBy.filter(id => id !== voterId)
          };
          const updatedTasks = [...column.tasks];
          updatedTasks[taskIndex] = updatedTask;
          await updateColumn(columnId, { tasks: updatedTasks });
        }
        return;
      }

      // Adiciona o voto
      const updatedTask = {
        ...task,
        votes: (task.votes || 0) + 1,
        votedBy: [...(task.votedBy || []), voterId]
      };

      const updatedTasks = [...column.tasks];
      updatedTasks[taskIndex] = updatedTask;
      await updateColumn(columnId, { tasks: updatedTasks });

      // Salva o voto no localStorage para usuários não logados
      if (!user) {
        const votedTasks = JSON.parse(localStorage.getItem('votedTasks') || '[]');
        votedTasks.push(taskId);
        localStorage.setItem('votedTasks', JSON.stringify(votedTasks));
      }
    } catch (error) {
      console.error('Erro ao votar na task:', error);
    }
  };

  // Verifica se um usuário já votou em uma task
  const hasVoted = (taskId) => {
    try {
      const voterId = user ? user.uid : getVisitorId();
      const column = Object.values(columns).find(col => 
        col.tasks?.some(task => task.id === taskId)
      );
      
      if (!column) return false;
      
      const task = column.tasks.find(t => t.id === taskId);
      return task?.votedBy?.includes(voterId) || false;
    } catch (error) {
      console.error('Erro ao verificar voto:', error);
      return false;
    }
  };

  // Gera um ID único para visitantes não logados
  const getVisitorId = () => {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
  };

  // Move uma task entre colunas
  const moveTask = async (sourceColumnId, destinationColumnId, taskId, sourceIndex, destinationIndex) => {
    if (!user) return;
    
    try {
      // Ensure all IDs are strings
      const sourceId = String(sourceColumnId);
      const destId = String(destinationColumnId);
      const taskIdStr = String(taskId);
      
      const sourceColumn = columns[sourceId];
      const destinationColumn = columns[destId];
      
      if (!sourceColumn || !destinationColumn) {
        console.error('Colunas não encontradas:', { sourceId, destId });
        return;
      }

      // Ensure tasks arrays exist
      const sourceTasks = Array.isArray(sourceColumn.tasks) ? [...sourceColumn.tasks] : [];
      const destinationTasks = sourceId === destId 
        ? sourceTasks 
        : (Array.isArray(destinationColumn.tasks) ? [...destinationColumn.tasks] : []);

      // Find and move the task
      const [movedTask] = sourceTasks.splice(sourceIndex, 1);
      if (!movedTask) {
        console.error('Task não encontrada no índice:', sourceIndex);
        return;
      }

      // Ensure task ID is string
      movedTask.id = String(movedTask.id);
      destinationTasks.splice(destinationIndex, 0, movedTask);

      // Update columns
      if (sourceId === destId) {
        await updateColumn(sourceId, { tasks: destinationTasks });
      } else {
        await Promise.all([
          updateColumn(sourceId, { tasks: sourceTasks }),
          updateColumn(destId, { tasks: destinationTasks })
        ]);
      }
    } catch (error) {
      console.error('Erro ao mover task:', error);
    }
  };

  // Atualiza uma task existente
  const updateTask = async (columnId, taskId, updates) => {
    if (!user) return;
    
    try {
      const column = columns[columnId];
      if (!column) return;

      const taskIndex = column.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const updatedTask = {
        ...column.tasks[taskIndex],
        ...updates,
        updatedAt: new Date(),
        updatedBy: user.uid
      };

      const updatedTasks = [...column.tasks];
      updatedTasks[taskIndex] = updatedTask;

      await updateColumn(columnId, { tasks: updatedTasks });
    } catch (error) {
      console.error('Erro ao atualizar task:', error);
    }
  };

  // Remove uma task
  const deleteTask = async (columnId, taskId) => {
    if (!user) return;
    
    try {
      const column = columns[columnId];
      if (!column) return;

      const updatedTasks = column.tasks.filter(task => task.id !== taskId);
      await updateColumn(columnId, { tasks: updatedTasks });
    } catch (error) {
      console.error('Erro ao deletar task:', error);
    }
  };

  // Adiciona uma label a uma task
  const addLabel = async (columnId, taskId, label) => {
    if (!user) return;
    
    try {
      console.log('Adicionando label:', { columnId, taskId, label });
      const column = columns[columnId];
      if (!column) {
        console.error('Coluna não encontrada:', columnId);
        return;
      }

      const taskIndex = column.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        console.error('Task não encontrada:', taskId);
        return;
      }

      const task = column.tasks[taskIndex];
      console.log('Task atual:', task);
      
      const updatedTask = {
        ...task,
        labels: [...(task.labels || []), {
          id: crypto.randomUUID(),
          text: label.text,
          color: label.color
        }]
      };
      console.log('Task atualizada:', updatedTask);

      const updatedTasks = [...column.tasks];
      updatedTasks[taskIndex] = updatedTask;
      await updateColumn(columnId, { tasks: updatedTasks });
      console.log('Label adicionada com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar label:', error);
    }
  };

  // Remove uma label de uma task
  const removeLabel = async (columnId, taskId, labelId) => {
    if (!user) return;
    
    try {
      const column = columns[columnId];
      if (!column) return;

      const taskIndex = column.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const task = column.tasks[taskIndex];
      const updatedTask = {
        ...task,
        labels: task.labels.filter(label => label.id !== labelId)
      };

      const updatedTasks = [...column.tasks];
      updatedTasks[taskIndex] = updatedTask;
      await updateColumn(columnId, { tasks: updatedTasks });
    } catch (error) {
      console.error('Erro ao remover label:', error);
    }
  };

  return {
    columns,
    boardTitle,
    loading,
    updateColumn,
    deleteColumn,
    updateColumnsOrder,
    addTask,
    moveTask,
    updateBoardTitle,
    voteTask,
    hasVoted,
    updateTask,
    deleteTask,
    addLabel,
    removeLabel
  };
} 