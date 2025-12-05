import { Route, Switch, Redirect } from 'wouter';
import { SetupWizard } from '@features/setup';
import LoginPage from '@features/auth/pages/LoginPage/LoginPage';
import FirstLoginPage from '@features/auth/pages/FirstLoginPage';
import HomePage from '@features/home/pages/HomePage';
import { AlbumPage } from '@features/home/pages/AlbumPage';
import { AlbumsPage } from '@features/home/pages/AlbumsPage';
import { SearchResultsPage } from '@features/home/pages/SearchResultsPage';
import ArtistsPage from '@features/artists/pages/ArtistsPage/ArtistsPage';
import ArtistDetailPage from '@features/artists/pages/ArtistDetailPage/ArtistDetailPage';
import { ProfilePage } from '@features/profile/pages/ProfilePage';
import { SettingsPage } from '@features/settings';
import { PublicProfilePage } from '@features/public-profiles';
import AdminPage from '@features/admin/pages/AdminPage/AdminPage';
import PlaylistsPage from '@features/playlists/pages/PlaylistsPage';
import PlaylistDetailPage from '@features/playlists/pages/PlaylistDetailPage';
import { RadioPage } from '@features/radio/pages/RadioPage';
import { WaveMixPage } from '@features/recommendations/pages/WaveMixPage';
import { PlaylistDetailPage as WavePlaylistDetailPage } from '@features/recommendations/pages/PlaylistDetailPage';
import { DailyRedirect } from '@features/recommendations/pages/DailyRedirect';
import { ArtistPlaylistsPage } from '@features/recommendations/pages/ArtistPlaylistsPage';
import { GenrePlaylistsPage } from '@features/recommendations/pages/GenrePlaylistsPage';
import { ExplorePage } from '@features/explore/pages/ExplorePage';
import { UnplayedAlbumsPage } from '@features/explore/pages/UnplayedAlbumsPage';
import { SocialPage } from '@features/social';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AdminRoute } from '@shared/components/AdminRoute';
import { SetupGuard } from '@shared/components/SetupGuard';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { useAuthStore } from '@shared/store';
import { AudioPlayer } from '@features/player';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <ErrorBoundary>
      <Switch>
        {/* Setup Wizard (First-run) */}
        <Route path="/setup" component={SetupWizard} />

        {/* Login Route - Checks setup status first */}
        <Route path="/login">
          <SetupGuard>
            <LoginPage />
          </SetupGuard>
        </Route>

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

        {/* Settings Route (Protected) */}
        <Route path="/settings">
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        </Route>

        {/* User Public Profile Route (Protected) */}
        <Route path="/user/:userId">
          <ProtectedRoute>
            <PublicProfilePage />
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

        {/* Wave Mix Route (Protected) */}
        <Route path="/wave-mix">
          <ProtectedRoute>
            <WaveMixPage />
          </ProtectedRoute>
        </Route>

        {/* Wave Mix Playlist Detail Route (Protected) */}
        <Route path="/wave-mix/:id">
          <ProtectedRoute>
            <WavePlaylistDetailPage />
          </ProtectedRoute>
        </Route>

        {/* Artist Playlists Route (Protected) */}
        <Route path="/artist-playlists">
          <ProtectedRoute>
            <ArtistPlaylistsPage />
          </ProtectedRoute>
        </Route>

        {/* Genre Playlists Route (Protected) */}
        <Route path="/genre-playlists">
          <ProtectedRoute>
            <GenrePlaylistsPage />
          </ProtectedRoute>
        </Route>

        {/* Daily Mix Route (Protected) - Redirects to Wave Mix playlist */}
        <Route path="/daily">
          <ProtectedRoute>
            <DailyRedirect />
          </ProtectedRoute>
        </Route>

        {/* Explore Routes (Protected) */}
        <Route path="/explore/unplayed">
          <ProtectedRoute>
            <UnplayedAlbumsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/explore">
          <ProtectedRoute>
            <ExplorePage />
          </ProtectedRoute>
        </Route>

        {/* Social Route (Protected) */}
        <Route path="/social">
          <ProtectedRoute>
            <SocialPage />
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
    </ErrorBoundary>
  );
}

export default App;
