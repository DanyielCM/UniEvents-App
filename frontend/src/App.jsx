import { Routes, Route } from "react-router-dom";
import AdminOrganizerRequests from "./pages/AdminOrganizerRequests";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import OrganizerRequest from "./pages/OrganizerRequest";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cerere-organizator" element={<OrganizerRequest />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cereri-organizatori"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminOrganizerRequests />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
