import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import MeetPage from "@/pages/MeetPage";
import DiscoverPage from "@/pages/DiscoverPage";
import ChatsPage from "@/pages/ChatsPage";
import ConnectionSpacePage from "@/pages/ConnectionSpacePage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import QuizzesPage from "@/pages/QuizzesPage";
import InviteViewPage from "@/pages/InviteViewPage";
import SupportPage from "@/pages/SupportPage";
import AdminDashboard from "@/pages/AdminDashboard";
import BannedPage from "@/pages/BannedPage";
import MyAppealsPage from "@/pages/MyAppealsPage";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import PublicProfilePage from "@/pages/PublicProfilePage";
import UserPostsPage from "@/pages/UserPostsPage";
import MyPostsPage from "@/pages/MyPostsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import GrowPage from "@/pages/GrowPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { isBanned } = useAuth();

  if (isBanned) {
    return <BannedPage />;
  }

  return <AppLayout />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/invite" element={<InviteViewPage />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/meet" element={<MeetPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/connection/:connectionId" element={<ConnectionSpacePage />} />
              <Route path="/you" element={<ProfilePage />} />
              <Route path="/you/settings" element={<SettingsPage />} />
              <Route path="/you/alerts" element={<NotificationsPage />} />
              <Route path="/quizzes" element={<QuizzesPage />} />
              <Route path="/grow" element={<GrowPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/my-appeals" element={<MyAppealsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/u/:username" element={<PublicProfilePage />} />
              <Route path="/u/:username/posts" element={<UserPostsPage />} />
              <Route path="/my-posts" element={<MyPostsPage />} />
              <Route path="/post/:postId" element={<DiscoverPage />} />

              {/* Legacy redirects → new IA */}
              <Route path="/ask" element={<Navigate to="/meet?tab=invite" replace />} />
              <Route path="/find-love" element={<Navigate to="/meet?tab=dating" replace />} />
              <Route path="/friends" element={<Navigate to="/meet?tab=people" replace />} />
              <Route path="/profile" element={<Navigate to="/you" replace />} />
              <Route path="/settings" element={<Navigate to="/you/settings" replace />} />
              <Route path="/notifications" element={<Navigate to="/you/alerts" replace />} />
              <Route path="/meet/invite" element={<Navigate to="/meet?tab=invite" replace />} />
              <Route path="/meet/dating" element={<Navigate to="/meet?tab=dating" replace />} />
              <Route path="/meet/people" element={<Navigate to="/meet?tab=people" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
