import { Routes, Route } from "react-router-dom";
import AdminEventsValidation from "./pages/AdminEventsValidation";
import AdminReports from "./pages/AdminReports";
import OrganizerEventStats from "./pages/OrganizerEventStats";
import AdminOrganizerRequests from "./pages/AdminOrganizerRequests";
import Dashboard from "./pages/Dashboard";
import EventDetail from "./pages/EventDetail";
import EventEditor from "./pages/EventEditor";
import Events from "./pages/Events";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import MyRegistrations from "./pages/MyRegistrations";
import OrganizerEventMaterials from "./pages/OrganizerEventMaterials";
import OrganizerParticipants from "./pages/OrganizerParticipants";
import OrganizerEvents from "./pages/OrganizerEvents";
import OrganizerRequest from "./pages/OrganizerRequest";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cerere-organizator" element={<OrganizerRequest />} />
      <Route path="/evenimente" element={<Events />} />
      <Route path="/evenimente/:id" element={<EventDetail />} />

      {/* Student */}
      <Route
        path="/inscrierile-mele"
        element={
          <ProtectedRoute roles={["student"]}>
            <MyRegistrations />
          </ProtectedRoute>
        }
      />

      {/* Authenticated */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Organizer */}
      <Route
        path="/organizator/evenimente"
        element={
          <ProtectedRoute roles={["organizer"]}>
            <OrganizerEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizator/eveniment/nou"
        element={
          <ProtectedRoute roles={["organizer"]}>
            <EventEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizator/eveniment/:id/statistici"
        element={
          <ProtectedRoute roles={["organizer", "admin"]}>
            <OrganizerEventStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizator/eveniment/:id/participanti"
        element={
          <ProtectedRoute roles={["organizer", "admin"]}>
            <OrganizerParticipants />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizator/eveniment/:id/materiale"
        element={
          <ProtectedRoute roles={["organizer"]}>
            <OrganizerEventMaterials />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizator/eveniment/:id/editeaza"
        element={
          <ProtectedRoute roles={["organizer"]}>
            <EventEditor />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/rapoarte"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminReports />
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
      <Route
        path="/admin/validare-evenimente"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminEventsValidation />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
