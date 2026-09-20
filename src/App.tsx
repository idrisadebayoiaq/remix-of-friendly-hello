import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import AskPage from "@/pages/AskPage";
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
import FriendsPage from "@/pages/FriendsPage";
import FindLovePage from "@/pages/FindLovePage";
import NotificationsPage from "@/pages/NotificationsPage";
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
              <Route path="/ask" element={<AskPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/connection/:connectionId" element={<ConnectionSpacePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/quizzes" element={<QuizzesPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/my-appeals" element={<MyAppealsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/u/:username" element={<PublicProfilePage />} />
              <Route path="/u/:username/posts" element={<UserPostsPage />} />
              <Route path="/my-posts" element={<MyPostsPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/find-love" element={<FindLovePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/post/:postId" element={<DiscoverPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
