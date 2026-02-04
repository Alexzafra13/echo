import { lazy, Suspense } from 'react';
import { Route, Switch, Redirect } from 'wouter';
import { SetupWizard } from '@features/setup';
import LoginPage from '@features/auth/pages/LoginPage/LoginPage';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AdminRoute } from '@shared/components/AdminRoute';
import { SetupGuard } from '@shared/components/SetupGuard';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { PageLoader } from '@shared/components/PageLoader';
import { useAuthStore } from '@shared/store';
import { AudioPlayer } from '@features/player';

// Lazy loaded pages for better initial bundle size
const FirstLoginPage = lazy(() => import('@features/auth/pages/FirstLoginPage'));
const HomePage = lazy(() => import('@features/home/pages/HomePage'));
const AlbumPage = lazy(() =>
  import('@features/home/pages/AlbumPage').then((m) => ({ default: m.AlbumPage }))
);
const AlbumsPage = lazy(() =>
  import('@features/home/pages/AlbumsPage').then((m) => ({ default: m.AlbumsPage }))
);
const SearchResultsPage = lazy(() =>
  import('@features/home/pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage }))
);
const ArtistsPage = lazy(() => import('@features/artists/pages/ArtistsPage/ArtistsPage'));
const ArtistDetailPage = lazy(
  () => import('@features/artists/pages/ArtistDetailPage/ArtistDetailPage')
);
const ProfilePage = lazy(() =>
  import('@features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const SettingsPage = lazy(() =>
  import('@features/settings').then((m) => ({ default: m.SettingsPage }))
);
const PublicProfilePage = lazy(() =>
  import('@features/public-profiles').then((m) => ({ default: m.PublicProfilePage }))
);
const AdminPage = lazy(() => import('@features/admin/pages/AdminPage/AdminPage'));
const PlaylistsPage = lazy(() => import('@features/playlists/pages/PlaylistsPage'));
const PlaylistDetailPage = lazy(() => import('@features/playlists/pages/PlaylistDetailPage'));
const RadioPage = lazy(() =>
  import('@features/radio/pages/RadioPage').then((m) => ({ default: m.RadioPage }))
);
const WaveMixPage = lazy(() =>
  import('@features/recommendations/pages/WaveMixPage').then((m) => ({ default: m.WaveMixPage }))
);
const WavePlaylistDetailPage = lazy(() =>
  import('@features/recommendations/pages/PlaylistDetailPage').then((m) => ({
    default: m.PlaylistDetailPage,
  }))
);
const DailyRedirect = lazy(() =>
  import('@features/recommendations/pages/DailyRedirect').then((m) => ({
    default: m.DailyRedirect,
  }))
);
const ArtistPlaylistsPage = lazy(() =>
  import('@features/recommendations/pages/ArtistPlaylistsPage').then((m) => ({
    default: m.ArtistPlaylistsPage,
  }))
);
const GenrePlaylistsPage = lazy(() =>
  import('@features/recommendations/pages/GenrePlaylistsPage').then((m) => ({
    default: m.GenrePlaylistsPage,
  }))
);
const SocialPage = lazy(() =>
  import('@features/social').then((m) => ({ default: m.SocialPage }))
);
const TrendingPage = lazy(() =>
  import('@features/social').then((m) => ({ default: m.TrendingPage }))
);
const SharedAlbumPage = lazy(() =>
  import('@features/federation').then((m) => ({ default: m.SharedAlbumPage }))
);

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
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

          {/* Social Route (Protected) */}
          <Route path="/social">
            <ProtectedRoute>
              <SocialPage />
            </ProtectedRoute>
          </Route>

          {/* Trending Route (Protected) - Top 50 most played tracks */}
          <Route path="/trending">
            <ProtectedRoute>
              <TrendingPage />
            </ProtectedRoute>
          </Route>

          {/* Federation Album Route (Protected) */}
          <Route path="/federation/album/:serverId/:albumId">
            <ProtectedRoute>
              <SharedAlbumPage />
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
      </Suspense>

      {/* Audio Player - Only show when authenticated */}
      {isAuthenticated && <AudioPlayer />}
    </ErrorBoundary>
  );
}

export default App;
