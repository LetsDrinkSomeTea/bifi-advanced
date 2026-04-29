import { Switch, Route, Redirect } from 'wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Shop } from './pages/Shop'
import { History } from './pages/History'
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

        {/* Stubs for phases 4–7 */}
        <Route path="/feed">
          <ProtectedRoute><Placeholder title="Feed" /></ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute><Placeholder title="Profil" /></ProtectedRoute>
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
