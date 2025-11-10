import { Route, Switch, Redirect } from 'wouter';
import LoginPage from '@features/auth/pages/LoginPage/LoginPage';
import FirstLoginPage from '@features/auth/pages/FirstLoginPage';
import HomePage from '@features/home/pages/HomePage';
import { AlbumPage } from '@features/home/pages/AlbumPage';
import { AlbumsPage } from '@features/home/pages/AlbumsPage';
import { SearchResultsPage } from '@features/home/pages/SearchResultsPage';
import ArtistsPage from '@features/artists/pages/ArtistsPage/ArtistsPage';
import ArtistDetailPage from '@features/artists/pages/ArtistDetailPage/ArtistDetailPage';
import { ProfilePage } from '@features/profile/pages/ProfilePage';
import AdminPage from '@features/admin/pages/AdminPage/AdminPage';
import PlaylistsPage from '@features/playlists/pages/PlaylistsPage';
import PlaylistDetailPage from '@features/playlists/pages/PlaylistDetailPage';
import { RadioPage } from '@features/radio/pages/RadioPage';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AdminRoute } from '@shared/components/AdminRoute';
import { useAuthStore } from '@shared/store';
import { AudioPlayer } from '@features/player';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <>
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

        {/* Search Results Route (Protected) */}
        <Route path="/search">
          <ProtectedRoute>
            <SearchResultsPage />
          </ProtectedRoute>
        </Route>

        {/* Profile Route (Protected) */}
        <Route path="/profile">
          <ProtectedRoute>
            <ProfilePage />
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

        {/* Artists List Route (Protected) */}
        <Route path="/artists">
          <ProtectedRoute>
            <ArtistsPage />
          </ProtectedRoute>
        </Route>

        {/* Artist Detail Route (Protected) */}
        <Route path="/artists/:id">
          <ProtectedRoute>
            <ArtistDetailPage />
          </ProtectedRoute>
        </Route>

        {/* Playlists List Route (Protected) */}
        <Route path="/playlists">
          <ProtectedRoute>
            <PlaylistsPage />
          </ProtectedRoute>
        </Route>

        {/* Playlist Detail Route (Protected) */}
        <Route path="/playlists/:id">
          <ProtectedRoute>
            <PlaylistDetailPage />
          </ProtectedRoute>
        </Route>

        {/* Radio Route (Protected) */}
        <Route path="/radio">
          <ProtectedRoute>
            <RadioPage />
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

      {/* Audio Player - Only show when authenticated */}
      {isAuthenticated && <AudioPlayer />}
    </>
  );
}

export default App;
