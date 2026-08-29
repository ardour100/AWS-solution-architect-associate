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
      {/* Taking practice exams is anonymous — no account needed. */}
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/exams/:examId" element={<ExamPage />} />
        {/* Only question-bank management requires the admin sign-in. */}
        <Route
          path="/admin/questions"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminQuestionsPage />
              </RequireAdmin>
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
