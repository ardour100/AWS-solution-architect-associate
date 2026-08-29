import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './useAuth';

/** Redirects anonymous users to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

/** Blocks non-admin users with a 403 view. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-4xl font-bold text-slate-300">403</p>
        <p className="mt-2 text-slate-600">Admin access required to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
