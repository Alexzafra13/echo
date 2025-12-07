import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut, Settings, User } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const { user, isAuthenticated, clearAuth } = useAuthStore();

  const styles = createStyles(isDark);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.title}>Inicia sesión</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={40} color={isDark ? '#ffffff' : '#000000'} />
          </View>
          <Text style={styles.username}>{user?.name || user?.username}</Text>
          <Text style={styles.email}>@{user?.username}</Text>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Settings size={24} color={isDark ? '#ffffff' : '#000000'} />
            <Text style={styles.menuText}>Configuración</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <LogOut size={24} color="#ef4444" />
            <Text style={[styles.menuText, styles.logoutText]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#000000',
      marginBottom: 16,
    },
    loginButton: {
      backgroundColor: '#6366f1',
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 8,
    },
    loginButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    avatarContainer: {
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 32,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? '#2a2a4e' : '#e0e0e0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    username: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#000000',
    },
    email: {
      fontSize: 16,
      color: isDark ? '#888888' : '#666666',
      marginTop: 4,
    },
    menuSection: {
      marginTop: 16,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2a2a4e' : '#e0e0e0',
    },
    menuText: {
      fontSize: 16,
      color: isDark ? '#ffffff' : '#000000',
      marginLeft: 16,
    },
    logoutText: {
      color: '#ef4444',
    },
  });
