import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import LoginPage from "./auth/Login";
import ExperiencesPage from "./pages/Experiences";
import RegisterPage from "./auth/Register";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/experiences"
            element={
              <ProtectedRoute>
                <ExperiencesPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
