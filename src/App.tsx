// App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./Pages/Login";
import Home from "./Pages/Home";
import Register from "./Pages/Register";
import ForgotPassword from "./Pages/ForgotPassword";
import ItemDetailPage from "./Pages/ItemDetailPage";
import { NotificationProvider } from "./components/NotificationProvider";
import { ConfirmProvider } from "./context/ConfirmContext";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              {/* Root – goes to workspace dashboard */}
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              {/* User profile view – shows profile of specific user */}
              <Route path="/profile/user/:userId" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              {/* Board view – restores workspace + board on refresh */}
              <Route path="/workspace/:workspaceId/board/:boardId" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              {/* Item detail – restores workspace + board + item on refresh */}
              <Route path="/workspace/:workspaceId/board/:boardId/item/:itemId" element={<ProtectedRoute><ItemDetailPage /></ProtectedRoute>} />
              {/* Legacy item routes kept for backward-compat */}
              <Route path="/item/:itemId" element={<ProtectedRoute><ItemDetailPage /></ProtectedRoute>} />
              <Route path="/items/:itemId" element={<ProtectedRoute><ItemDetailPage /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;
  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default App;