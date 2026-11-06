import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  redirectPath = '/login',
}) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading ...</div>;
  }

  if (!currentUser) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  const userRole = currentUser.role || 'user';
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    const fallback = userRole === 'admin' ? '/admin/dashboard' : '/';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default ProtectedRoute;
