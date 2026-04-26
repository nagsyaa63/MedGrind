import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import QuestionFeedPage from './pages/QuestionFeedPage';
import CreateQuestionPage from './pages/CreateQuestionPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ChallengedQuestionsPage from './pages/ChallengedQuestionsPage';
import AdminPage from './pages/AdminPage';

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/questions" element={<ProtectedRoute><AppLayout><QuestionFeedPage /></AppLayout></ProtectedRoute>} />
          <Route path="/questions/new" element={<ProtectedRoute><AppLayout><CreateQuestionPage /></AppLayout></ProtectedRoute>} />
          <Route path="/questions/challenged" element={<ProtectedRoute><AppLayout><ChallengedQuestionsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/questions/:id" element={<ProtectedRoute><AppLayout><QuestionDetailPage /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><AppLayout><EditProfilePage /></AppLayout></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><AppLayout><LeaderboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AppLayout><AdminPage /></AppLayout></AdminRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
