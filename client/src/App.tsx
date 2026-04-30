import { Switch, Route, Redirect } from 'wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Shop } from './pages/Shop'
import { History } from './pages/History'
import { Feed } from './pages/Feed'
import { Profile } from './pages/Profile'
import { ProfileDetail } from './pages/ProfileDetail'
import { People } from './pages/People'
import { Groups } from './pages/Groups'
import { GroupDetail } from './pages/GroupDetail'
import { Leaderboard } from './pages/Leaderboard'
import { AllAchievements } from './pages/AllAchievements'
import { AdminUsers } from './pages/admin/Users'
import { AdminProducts } from './pages/admin/Products'
import { AdminSettlement } from './pages/admin/Settlement'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
      {title} — kommt bald
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/login" component={Login} />

        <Route path="/">
          <ProtectedRoute><Home /></ProtectedRoute>
        </Route>
        <Route path="/shop">
          <ProtectedRoute><Shop /></ProtectedRoute>
        </Route>
        <Route path="/history">
          <ProtectedRoute><History /></ProtectedRoute>
        </Route>

        <Route path="/profile">
          <ProtectedRoute><Profile /></ProtectedRoute>
        </Route>
        <Route path="/profile/:userId">
          {(params) => <ProtectedRoute><ProfileDetail /></ProtectedRoute>}
        </Route>

        <Route path="/feed">
          <ProtectedRoute><Feed /></ProtectedRoute>
        </Route>
        <Route path="/people">
          <ProtectedRoute><People /></ProtectedRoute>
        </Route>
        <Route path="/groups">
          <ProtectedRoute><Groups /></ProtectedRoute>
        </Route>
        <Route path="/groups/:groupId">
          {(params) => <ProtectedRoute><GroupDetail /></ProtectedRoute>}
        </Route>
        <Route path="/leaderboard">
          <ProtectedRoute><Leaderboard /></ProtectedRoute>
        </Route>
        <Route path="/achievements">
          <ProtectedRoute><AllAchievements /></ProtectedRoute>
        </Route>
        <Route path="/achievements/:userId">
          {() => <ProtectedRoute><AllAchievements /></ProtectedRoute>}
        </Route>

        {/* Admin */}
        <Route path="/admin">
          <Redirect to="/admin/users" />
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute requireRole="moderator"><AdminUsers /></ProtectedRoute>
        </Route>
        <Route path="/admin/products">
          <ProtectedRoute requireRole="moderator"><AdminProducts /></ProtectedRoute>
        </Route>
        <Route path="/admin/settlement">
          <ProtectedRoute requireRole="moderator"><AdminSettlement /></ProtectedRoute>
        </Route>

        {/* Catch-all */}
        <Route>
          <ProtectedRoute><Home /></ProtectedRoute>
        </Route>
      </Switch>
    </QueryClientProvider>
  )
}
