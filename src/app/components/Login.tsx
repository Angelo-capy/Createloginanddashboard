import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export default function Login() {
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/dashboard');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let emailToUse = usernameOrEmail;

      // Check if input is an email (contains @) or username
      const isEmail = usernameOrEmail.includes('@');

      if (!isEmail) {
        // If it's a username, get the email from backend
        const emailResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-22886cdc/get-email-by-username`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ username: usernameOrEmail }),
          }
        );

        const emailData = await emailResponse.json();

        if (!emailResponse.ok) {
          throw new Error(emailData.error || 'Usuario no encontrado');
        }

        emailToUse = emailData.email;
      }

      // Now login with the email (either provided directly or obtained from username)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        toast.success('¡Bienvenido!', {
          description: 'Has iniciado sesión correctamente.',
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.log(`Error during login: ${err.message}`);
      setError(err.message);
      toast.error('Error al iniciar sesión', {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl mb-6 text-center text-gray-800">Iniciar Sesión</h1>
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="usernameOrEmail" className="block text-sm text-gray-700 mb-1">
              Username o Email
            </label>
            <input
              type="text"
              id="usernameOrEmail"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Ingresa tu username o email"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <button
            onClick={() => navigate('/registro')}
            className="text-blue-600 hover:underline"
          >
            Regístrate
          </button>
        </p>
      </div>
    </div>
  );
}
