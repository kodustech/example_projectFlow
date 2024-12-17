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
        newColumns[doc.id] = { id: doc.id, ...doc.data() };
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
      
      Object.values(newColumns).forEach((column) => {
        const columnRef = doc(db, 'boards/main/columns', column.id);
        batch.update(columnRef, { order: column.order });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Erro ao atualizar ordem das colunas:', error);
    }
  };

  // Adiciona uma nova task
  const addTask = async (columnId, taskData) => {
    if (!user) return;
    
    try {
      const column = columns[columnId];
      if (!column) return;

      const taskWithVotes = {
        ...taskData,
        votes: 0,
        votedBy: [],
        createdBy: user.uid,
        createdAt: new Date()
      };

      const updatedTasks = [...(column.tasks || []), taskWithVotes];
      await updateColumn(columnId, { tasks: updatedTasks });
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
      visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
  };

  // Move uma task entre colunas
  const moveTask = async (sourceColumnId, destinationColumnId, taskId, sourceIndex, destinationIndex) => {
    if (!user) return;
    
    try {
      const sourceColumn = columns[sourceColumnId];
      const destinationColumn = columns[destinationColumnId];
      
      if (!sourceColumn || !destinationColumn) return;

      const sourceTasks = [...(sourceColumn.tasks || [])];
      const [movedTask] = sourceTasks.splice(sourceIndex, 1);

      const destinationTasks = sourceColumnId === destinationColumnId 
        ? sourceTasks 
        : [...(destinationColumn.tasks || [])];

      destinationTasks.splice(destinationIndex, 0, movedTask);

      if (sourceColumnId === destinationColumnId) {
        await updateColumn(sourceColumnId, { tasks: destinationTasks });
      } else {
        await Promise.all([
          updateColumn(sourceColumnId, { tasks: sourceTasks }),
          updateColumn(destinationColumnId, { tasks: destinationTasks })
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
    updateTask
  };
} 