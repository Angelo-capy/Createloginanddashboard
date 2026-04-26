import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  userId: string;
  createdAt: string;
  expiry_date?: string;
  expiry_time?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-22886cdc/tasks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar tareas');
      }

      setTasks(data.tasks);
    } catch (err: any) {
      console.log(`Error loading tasks: ${err.message}`);
      setError(err.message);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar que la fecha no sea pasada
    if (dueDate) {
      const selectedDate = new Date(`${dueDate}T${dueTime || '00:00'}`);
      const now = new Date();

      if (selectedDate < now) {
        toast.error('Error: Fecha pasada', {
          description: 'No puedes agendar una tarea en una fecha u hora que ya pasó.',
          duration: 4000,
        });
        return;
      }
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-22886cdc/tasks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, description, dueDate, dueTime }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear tarea');
      }

      setTasks([...tasks, data.task]);
      setTitle('');
      setDescription('');
      setDueDate('');
      setDueTime('');

      toast.success('¡Tarea creada exitosamente!', {
        description: `${title} ha sido agregada a tu agenda.`,
        duration: 3000,
      });
    } catch (err: any) {
      console.log(`Error creating task: ${err.message}`);
      setError(err.message);
      toast.error('Error al crear tarea', {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-22886cdc/tasks/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar tarea');
      }

      setTasks(tasks.map((task) => (task.id === id ? data.task : task)));

      if (newStatus === 'completed') {
        toast.success('Tarea completada', {
          description: 'Has marcado la tarea como completada.',
        });
      } else {
        toast.info('Tarea marcada como pendiente', {
          description: 'La tarea vuelve a estar pendiente.',
        });
      }
    } catch (err: any) {
      console.log(`Error updating task status: ${err.message}`);
      setError(err.message);
      toast.error('Error al actualizar tarea', {
        description: err.message,
      });
    }
  };

  const handleDeleteTask = async (id: string, taskTitle: string) => {
    const deleteButton = document.querySelector(`[data-task-id="${id}"]`);

    if (deleteButton) {
      deleteButton.classList.add('shake-animation');
      setTimeout(() => deleteButton.classList.remove('shake-animation'), 500);
    }

    toast((t) => (
      <div className="flex flex-col gap-2">
        <div>
          <p className="font-semibold">¿Eliminar tarea?</p>
          <p className="text-sm text-gray-600">Esta acción no se puede deshacer.</p>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              toast.dismiss(t);
              try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/make-server-22886cdc/tasks/${id}`,
                  {
                    method: 'DELETE',
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(data.error || 'Error al eliminar tarea');
                }

                setTasks(tasks.filter((task) => task.id !== id));
                toast.success('Tarea eliminada', {
                  description: `"${taskTitle}" ha sido eliminada.`,
                });
              } catch (err: any) {
                console.log(`Error deleting task: ${err.message}`);
                setError(err.message);
                toast.error('Error al eliminar tarea', {
                  description: err.message,
                });
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('access_token');
    toast.info('Sesión cerrada', {
      description: 'Has cerrado sesión exitosamente.',
    });
    navigate('/');
  };

  const isTaskExpired = (expiryDate?: string, expiryTime?: string): boolean => {
    if (!expiryDate) return false;
    const now = new Date();
    const taskDeadline = new Date(`${expiryDate}T${expiryTime || '23:59'}`);
    return now > taskDeadline;
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.expiry_date && !b.expiry_date) return 0;
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;

    const dateA = new Date(`${a.expiry_date}T${a.expiry_time || '00:00'}`);
    const dateB = new Date(`${b.expiry_date}T${b.expiry_time || '00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return null;
    const dateObj = new Date(`${date}T${time || '00:00'}`);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: time ? '2-digit' : undefined,
      minute: time ? '2-digit' : undefined
    };
    return dateObj.toLocaleDateString('es-ES', options);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">SecureTask Pro</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-all hover:shadow-md"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="task-card p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        <div className="task-card bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Nueva Tarea</h2>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <input
                type="text"
                id="taskTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>
            <div>
              <label htmlFor="taskDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="taskDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de vencimiento
                </label>
                <input
                  type="time"
                  id="dueTime"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="button-primary px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all disabled:bg-blue-400 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              {loading ? 'Agregando...' : 'Agregar Tarea'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Agenda de Tareas</h2>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay tareas creadas</p>
          ) : (
            <div className="space-y-3">
              {sortedTasks.map((task, index) => {
                const isExpired = isTaskExpired(task.expiry_date, task.expiry_time);
                const borderColor = task.status === 'completed'
                  ? 'border-green-500'
                  : isExpired
                    ? 'border-red-500'
                    : 'border-blue-500';

                return (
                <div
                  key={task.id}
                  className={`task-card bg-white p-4 rounded-lg shadow-md border-l-4 transition-all hover:shadow-lg hover:-translate-y-1 ${borderColor} ${
                    isExpired && task.status !== 'completed' ? 'bg-red-50' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3
                          className={`text-base font-semibold ${
                            task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                          }`}
                        >
                          {task.title}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : isExpired
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {task.status === 'completed' ? 'Completada' : isExpired ? '⚠️ Vencida' : 'Pendiente'}
                        </span>
                      </div>
                      <p
                        className={`text-sm mb-2 ${
                          task.status === 'completed' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {task.description}
                      </p>
                      {(task.expiry_date || task.expiry_time) && (
                        <div className={`flex items-center gap-2 text-sm ${
                          isExpired && task.status !== 'completed' ? 'text-red-600 font-semibold' : 'text-gray-500'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDateTime(task.expiry_date, task.expiry_time)}</span>
                          {isExpired && task.status !== 'completed' && (
                            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                              VENCIDA
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleUpdateStatus(task.id, task.status)}
                        className={`button-secondary px-3 py-1.5 text-white text-xs rounded transition-all hover:shadow-md transform hover:-translate-y-0.5 ${
                          task.status === 'completed'
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {task.status === 'completed' ? '↩ Pendiente' : '✓ Completar'}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id, task.title)}
                        data-task-id={task.id}
                        className="button-delete px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-all hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
