import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import React from "react";
import PageLoader from "@/components/ui/PageLoader";

export function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: "admin" | "coach" | "user" | "moderator" }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Admin can access everything
  if (user.role === "admin") return <>{children}</>;

  // Moderator can access admin routes and user routes
  if (role === "admin" && user.role === "moderator") return <>{children}</>;

  // Coach can access coach routes and user routes
  if (role === "coach" && user.role !== "coach") {
    return <Navigate to="/" replace />;
  }

  // Regular user route check
  if (role === "user" && user.role !== "user" && user.role !== "coach" && user.role !== "moderator") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
