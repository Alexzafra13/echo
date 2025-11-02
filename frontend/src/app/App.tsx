import { Route, Switch, Redirect } from 'wouter';
import LoginPage from '@features/auth/pages/LoginPage/LoginPage';
import FirstLoginPage from '@features/auth/pages/FirstLoginPage';
import HomePage from '@features/home/pages/HomePage';
import { AlbumPage } from '@features/home/pages/AlbumPage';
import { AlbumsPage } from '@features/home/pages/AlbumsPage';
import AdminPage from '@features/admin/pages/AdminPage/AdminPage';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AdminRoute } from '@shared/components/AdminRoute';
import { useAuthStore } from '@shared/store';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Switch>
      {/* Login Route */}
      <Route path="/login" component={LoginPage} />

      {/* First Login - Change Password (Protected) */}
      <Route path="/first-login">
        <ProtectedRoute>
          <FirstLoginPage />
        </ProtectedRoute>
      </Route>

      {/* Home Route (Protected) */}
      <Route path="/home">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>

      {/* Albums List Route (Protected) */}
      <Route path="/albums">
        <ProtectedRoute>
          <AlbumsPage />
        </ProtectedRoute>
      </Route>

      {/* Album Detail Route (Protected) */}
      <Route path="/album/:id">
        <ProtectedRoute>
          <AlbumPage />
        </ProtectedRoute>
      </Route>

      {/* Admin Route (Protected - Admin Only) */}
      <Route path="/admin">
        <AdminRoute>
          <AdminPage />
        </AdminRoute>
      </Route>

      {/* Root - Redirect based on auth status */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/home" /> : <Redirect to="/login" />}
      </Route>

      {/* 404 - Redirect to home or login */}
      <Route>
        {isAuthenticated ? <Redirect to="/home" /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

export default App;
