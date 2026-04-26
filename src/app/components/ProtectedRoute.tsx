import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('access_token');

      if (!token) {
        navigate('/');
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          localStorage.removeItem('access_token');
          navigate('/');
          return;
        }

        setIsValidating(false);
      } catch (error) {
        localStorage.removeItem('access_token');
        navigate('/');
      }
    };

    validateSession();
  }, [navigate]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Validando sesión...</div>
      </div>
    );
  }

  return <>{children}</>;
}
