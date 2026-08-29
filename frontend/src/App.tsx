import { Navigate, Route, Routes } from 'react-router';
import { RequireAdmin, RequireAuth } from './auth/guards';
import Layout from './components/Layout';
import AdminQuestionsPage from './pages/AdminQuestionsPage';
import ExamPage from './pages/ExamPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/exams/:examId" element={<ExamPage />} />
        <Route
          path="/admin/questions"
          element={
            <RequireAdmin>
              <AdminQuestionsPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
