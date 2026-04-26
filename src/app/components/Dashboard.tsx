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
  priority?: 'baja' | 'media' | 'alta';
  deadline?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta'>('media');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('priority');

  useEffect(() => {
    loadTasks();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata?.username) {
        setUsername(user.user_metadata.username);
      }
    } catch (err: any) {
      console.log(`Error loading user data: ${err.message}`);
    }
  };

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
          body: JSON.stringify({ title, description, dueDate, dueTime, priority, deadline }),
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
      setPriority('media');
      setDeadline('');

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

  const isTaskExpired = (task: Task): boolean => {
    const now = new Date();

    // Check deadline first
    if (task.deadline) {
      const deadlineDate = new Date(`${task.deadline}T23:59:59`);
      if (now > deadlineDate) return true;
    }

    // Check expiry_date + expiry_time
    if (task.expiry_date) {
      const taskDeadline = new Date(`${task.expiry_date}T${task.expiry_time || '23:59'}`);
      if (now > taskDeadline) return true;
    }

    return false;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'alta':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'media':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'baja':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'alta':
        return '🔴';
      case 'media':
        return '🟡';
      case 'baja':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const isDeadlineNear = (task: Task): boolean => {
    const now = new Date();
    const hoursUntilDeadline = (deadline: Date) => {
      return (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    };

    if (task.deadline) {
      const deadlineDate = new Date(`${task.deadline}T23:59:59`);
      const hours = hoursUntilDeadline(deadlineDate);
      if (hours > 0 && hours <= 24) return true;
    }

    if (task.expiry_date) {
      const expiryDate = new Date(`${task.expiry_date}T${task.expiry_time || '23:59'}`);
      const hours = hoursUntilDeadline(expiryDate);
      if (hours > 0 && hours <= 24) return true;
    }

    return false;
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'priority') {
      // Sort by priority first
      const priorityOrder = { alta: 3, media: 2, baja: 1 };
      const priorityA = priorityOrder[a.priority || 'media'];
      const priorityB = priorityOrder[b.priority || 'media'];

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Descending order (alta first)
      }

      // Then sort by deadline/expiry_date
      const getTaskDate = (task: Task) => {
        if (task.deadline) return new Date(task.deadline).getTime();
        if (task.expiry_date) return new Date(`${task.expiry_date}T${task.expiry_time || '00:00'}`).getTime();
        return Infinity;
      };

      const dateA = getTaskDate(a);
      const dateB = getTaskDate(b);

      return dateA - dateB; // Ascending order (nearest first)
    } else {
      // Sort by deadline only
      const getTaskDate = (task: Task) => {
        if (task.deadline) return new Date(task.deadline).getTime();
        if (task.expiry_date) return new Date(`${task.expiry_date}T${task.expiry_time || '00:00'}`).getTime();
        return Infinity;
      };

      const dateA = getTaskDate(a);
      const dateB = getTaskDate(b);

      return dateA - dateB; // Ascending order (nearest first)
    }
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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-800">SecureTask Pro</h1>
              {username && (
                <div className="hidden md:flex items-center gap-2 username-welcome">
                  <span className="text-gray-400 text-lg">|</span>
                  <span className="text-sm text-gray-600 font-medium">Bienvenido,</span>
                  <span className="username-badge text-sm px-4 py-1.5 rounded-full">
                    {username}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-all hover:shadow-md"
            >
              Cerrar Sesión
            </button>
          </div>
          {username && (
            <div className="md:hidden mt-2 username-welcome">
              <span className="username-badge text-xs px-3 py-1 rounded-full inline-block">
                👋 {username}
              </span>
            </div>
          )}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'baja' | 'media' | 'alta')}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                >
                  <option value="baja">🟢 Baja</option>
                  <option value="media">🟡 Media</option>
                  <option value="alta">🔴 Alta</option>
                </select>
              </div>
              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                  Plazo límite
                </label>
                <input
                  type="date"
                  id="deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Agenda de Tareas</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setSortBy('priority')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    sortBy === 'priority'
                      ? 'bg-white text-blue-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  🎯 Prioridad
                </button>
                <button
                  onClick={() => setSortBy('deadline')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    sortBy === 'deadline'
                      ? 'bg-white text-blue-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📅 Plazo
                </button>
              </div>
            </div>
          </div>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay tareas creadas</p>
          ) : (
            <div className="space-y-3">
              {sortedTasks.map((task, index) => {
                const isExpired = isTaskExpired(task);
                const deadlineNear = isDeadlineNear(task);
                const borderColor = task.status === 'completed'
                  ? 'border-green-500'
                  : isExpired
                    ? 'border-red-500'
                    : task.priority === 'alta'
                      ? 'border-red-400'
                      : task.priority === 'media'
                        ? 'border-yellow-400'
                        : 'border-blue-500';

                return (
                <div
                  key={task.id}
                  className={`task-card bg-white p-4 rounded-lg shadow-md border-l-4 transition-all hover:shadow-lg hover:-translate-y-1 ${borderColor} ${
                    isExpired && task.status !== 'completed' ? 'bg-red-50' : ''
                  } ${
                    deadlineNear && task.status !== 'completed' ? 'deadline-near-pulse' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Priority Indicator Bar */}
                    <div className={`w-1.5 rounded-full self-stretch ${
                      task.priority === 'alta'
                        ? 'bg-red-500'
                        : task.priority === 'media'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`} />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3
                          className={`text-base font-semibold ${
                            task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                          }`}
                        >
                          {task.title}
                        </h3>
                        {task.priority && (
                          <span className={`priority-badge text-xs px-2.5 py-1 rounded-full font-bold ${getPriorityColor(task.priority)}`}>
                            {getPriorityIcon(task.priority)} {task.priority.toUpperCase()}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : isExpired
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {task.status === 'completed' ? '✓ Completada' : isExpired ? '⚠️ Vencida' : '○ Pendiente'}
                        </span>
                        {deadlineNear && task.status !== 'completed' && !isExpired && (
                          <span className="urgent-badge text-xs px-2.5 py-1 rounded-full font-bold bg-orange-100 text-orange-700 border border-orange-300">
                            ⏰ Urgente
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm mb-2 ${
                          task.status === 'completed' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {task.description}
                      </p>
                      {/* Deadline Section - More Prominent */}
                      <div className={`mt-2 p-2.5 rounded-lg ${
                        isExpired && task.status !== 'completed'
                          ? 'bg-red-100 border border-red-300'
                          : deadlineNear && task.status !== 'completed'
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-gray-50 border border-gray-200'
                      }`}>
                        {task.deadline && (
                          <div className={`flex items-center gap-2 mb-1 ${
                            isExpired && task.status !== 'completed'
                              ? 'text-red-700 font-bold'
                              : deadlineNear && task.status !== 'completed'
                                ? 'text-orange-700 font-semibold'
                                : 'text-gray-700'
                          }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold">
                              {isExpired ? '🔴 ' : deadlineNear ? '🟠 ' : '📅 '}
                              Plazo: {new Date(task.deadline).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        {(task.expiry_date || task.expiry_time) && (
                          <div className={`flex items-center gap-2 ${
                            isExpired && task.status !== 'completed'
                              ? 'text-red-600 font-semibold'
                              : deadlineNear && task.status !== 'completed'
                                ? 'text-orange-600 font-medium'
                                : 'text-gray-600'
                          }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs">
                              Vencimiento: {formatDateTime(task.expiry_date, task.expiry_time)}
                            </span>
                          </div>
                        )}
                        {isExpired && task.status !== 'completed' && (
                          <div className="mt-2 pt-2 border-t border-red-300">
                            <span className="vencida-badge text-xs px-3 py-1 rounded-full inline-block">
                              ⚠️ TAREA VENCIDA
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-auto">
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
