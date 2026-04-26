import { createBrowserRouter } from 'react-router';
import Login from './components/Login';
import Registro from './components/Registro';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Login,
  },
  {
    path: '/registro',
    Component: Registro,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
]);
