import React from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Shop } from './pages/Shop';
import { History } from './pages/History';
import { Feed } from './pages/Feed';
import { Profile } from './pages/Profile';
import { ProfileDetail } from './pages/ProfileDetail';
import { SocialPage } from './pages/social/SocialPage';
import { StatsPage } from './pages/stats/StatsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { GroupDetail } from './pages/GroupDetail';
import { AllAchievements } from './pages/AllAchievements';


import { GlobalDialog } from './components/GlobalDialog';
import { DialogProvider } from './hooks/dialogContext';
import { JoinGroup } from './pages/JoinGroup';

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <DialogProvider>
        <Switch>
          <Route path="/login" component={Login} />

          <Route path="/shop">
            <ProtectedRoute>
              <Shop />
            </ProtectedRoute>
          </Route>
          <Route path="/history">
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          </Route>

          <Route path="/profile">
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </Route>
          {/* Stats Routes */}
          <Route path="/stats/:userId?/:type?">
            {() => (
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/profile/stats">
            <Redirect to="/stats" />
          </Route>
          <Route path="/profile/:userId/stats">
            {(params) => (
              <Redirect to={`/stats/${params.userId}`} />
            )}
          </Route>
          <Route path="/profile/:userId">
            {() => (
              <ProtectedRoute>
                <ProfileDetail />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/feed">
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          </Route>
          {/* Social Routes */}
          <Route path="/social/:tab?">
            {() => (
              <ProtectedRoute>
                <SocialPage />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/groups/:groupId">
            {(): React.JSX.Element => (
              <ProtectedRoute>
                <GroupDetail />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/join/:code">
            {(): React.JSX.Element => (
              <ProtectedRoute>
                <JoinGroup />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/leaderboard">
            <Redirect to="/social" />
          </Route>
          <Route path="/achievements">
            <ProtectedRoute>
              <AllAchievements />
            </ProtectedRoute>
          </Route>
          <Route path="/achievements/:userId">
            {(): React.JSX.Element => (
              <ProtectedRoute>
                <AllAchievements />
              </ProtectedRoute>
            )}
          </Route>

          {/* Admin */}
          <Route path="/admin/:page?">
            {() => (
              <ProtectedRoute requireRole="moderator">
                <AdminPage />
              </ProtectedRoute>
            )}
          </Route>

          {/* Catch-all */}
          <Route>
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          </Route>
        </Switch>
        <GlobalDialog />
      </DialogProvider>
    </QueryClientProvider>
  );
}
