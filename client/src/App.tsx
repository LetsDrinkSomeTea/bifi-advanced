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
import { Social } from './pages/Social';
import { GroupDetail } from './pages/GroupDetail';
import { AllAchievements } from './pages/AllAchievements';
import { ProfileStats } from './pages/ProfileStats';
import { AdminUsers } from './pages/admin/Users';
import { AdminProducts } from './pages/admin/Products';
import { AdminPromotions } from './pages/admin/Promotions';
import { AdminSettlement } from './pages/admin/Settlement';
import { JoinGroup } from './pages/JoinGroup';

import { GlobalDialog } from './components/GlobalDialog';
import { DialogProvider } from './hooks/dialogContext';

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
          <Route path="/profile/stats">
            <ProtectedRoute>
              <ProfileStats />
            </ProtectedRoute>
          </Route>
          <Route path="/profile/:userId">
            {(): React.JSX.Element => (
              <ProtectedRoute>
                <ProfileDetail />
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/profile/:userId/stats">
            {(): React.JSX.Element => (
              <ProtectedRoute>
                <ProfileStats />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/feed">
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          </Route>
          <Route path="/social">
            <ProtectedRoute>
              <Social />
            </ProtectedRoute>
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
          <Route path="/admin">
            <Redirect to="/admin/users" />
          </Route>
          <Route path="/admin/users">
            <ProtectedRoute requireRole="moderator">
              <AdminUsers />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/products">
            <ProtectedRoute requireRole="moderator">
              <AdminProducts />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/promotions">
            <ProtectedRoute requireRole="moderator">
              <AdminPromotions />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/settlement">
            <ProtectedRoute requireRole="moderator">
              <AdminSettlement />
            </ProtectedRoute>
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
