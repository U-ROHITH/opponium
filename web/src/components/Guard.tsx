import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "../data/types";
import { homeFor, useAuth } from "../lib/auth";
import { AuthLayout } from "./layouts";
import { ErrorState, LoadingText } from "./ui";

/** Shows children only to signed-in users with one of `roles`. Others go to /login or their own home. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, ready, error, retry } = useAuth();
  const loc = useLocation();
  if (!ready)
    return (
      <AuthLayout>
        <LoadingText />
      </AuthLayout>
    );
  if (!user && error)
    return (
      <AuthLayout>
        <ErrorState error={error} onRetry={retry} />
      </AuthLayout>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
