import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/lib/roles";

// Layout
import RootLayout from "@/components/layout/RootLayout";

// Auth Pages
import Login from "@/pages/auth/Login";

// Provider Pages
import ProviderDashboard from "@/pages/provider/Dashboard";
import CreateAuthorization from "@/pages/provider/CreateRequest";
import ProviderRequests from "@/pages/provider/Requests";
import ProviderRequestDetails from "@/pages/provider/RequestDetails";

// Reviewer Pages
import ReviewerDashboard from "@/pages/reviewer/Dashboard";
import ReviewQueue from "@/pages/reviewer/ReviewQueue";
import ReviewerRequests from "@/pages/reviewer/Requests";
import ReviewerRequestDetails from "@/pages/reviewer/RequestDetails";
import PolicyManagement from "@/pages/reviewer/Policies";
import PolicyDetails from "@/pages/reviewer/PolicyDetails";
import AuditTrail from "@/pages/reviewer/AuditTrail";
import PolicyCompanion from "@/pages/reviewer/PolicyCompanion";

// Shared Pages
import LandingHome from "@/pages/shared/LandingHome";
import Profile from "@/pages/shared/Profile";
import Notifications from "@/pages/shared/Notifications";

/**
 * PROTECTED ROUTE - MASTER PROMPT SECTION 32
 * Checks authentication status and redirects to login if needed
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * ROLE ROUTE - MASTER PROMPT SECTION 32
 * Restricts access to pages based on user role
 */
function RoleRoute({ allowedRoles, children }: { allowedRoles: UserRole[]; children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === "provider") {
      return <Navigate to="/provider/dashboard" replace />;
    } else if (user?.role === "reviewer") {
      return <Navigate to="/reviewer/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<LandingHome />} />
      <Route path="/home" element={<LandingHome />} />
      <Route path="/login" element={<Login />} />

      {/* PROTECTED ROUTES WITH LAYOUT */}
      <Route
        element={
          <ProtectedRoute>
            <RootLayout />
          </ProtectedRoute>
        }
      >
        {/* PROVIDER ROUTES - MASTER PROMPT SECTION 4 */}
        <Route
          path="/provider/*"
          element={
            <RoleRoute allowedRoles={["provider"]}>
              <Routes>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ProviderDashboard />} />
                <Route path="create-request" element={<CreateAuthorization />} />
                <Route path="requests" element={<ProviderRequests />} />
                <Route path="requests/:id" element={<ProviderRequestDetails />} />
              </Routes>
            </RoleRoute>
          }
        />

        {/* REVIEWER ROUTES - MASTER PROMPT SECTION 4 */}
        <Route
          path="/reviewer/*"
          element={
            <RoleRoute allowedRoles={["reviewer"]}>
              <Routes>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ReviewerDashboard />} />
                <Route path="review-queue" element={<ReviewQueue />} />
                <Route path="requests" element={<ReviewerRequests />} />
                <Route path="requests/:id" element={<ReviewerRequestDetails />} />
                <Route path="policy-companion" element={<PolicyCompanion />} />
                <Route path="policies" element={<PolicyManagement />} />
                <Route path="policies/:id" element={<PolicyDetails />} />
                <Route path="audit-trail" element={<AuditTrail />} />
              </Routes>
            </RoleRoute>
          }
        />

        {/* SHARED ROUTES - MASTER PROMPT SECTION 4 */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to={user?.role === "provider" ? "/provider/dashboard" : "/reviewer/dashboard"} replace />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
