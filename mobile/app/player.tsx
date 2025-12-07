import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, Play, SkipBack, SkipForward } from 'lucide-react-native';

export default function PlayerScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const styles = createStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronDown size={28} color={isDark ? '#ffffff' : '#000000'} />
        </TouchableOpacity>
      </View>

      <View style={styles.albumArt}>
        <View style={styles.artPlaceholder} />
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>Nombre de la canción</Text>
        <Text style={styles.artist}>Artista</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '30%' }]} />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.time}>1:23</Text>
          <Text style={styles.time}>4:56</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity>
          <SkipBack size={32} color={isDark ? '#ffffff' : '#000000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton}>
          <Play size={32} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <SkipForward size={32} color={isDark ? '#ffffff' : '#000000'} />
        </TouchableOpacity>
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
    header: {
      padding: 16,
    },
    albumArt: {
      alignItems: 'center',
      paddingHorizontal: 32,
      marginTop: 32,
    },
    artPlaceholder: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: isDark ? '#2a2a4e' : '#e0e0e0',
      borderRadius: 8,
    },
    info: {
      alignItems: 'center',
      marginTop: 32,
      paddingHorizontal: 32,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#000000',
    },
    artist: {
      fontSize: 18,
      color: isDark ? '#888888' : '#666666',
      marginTop: 4,
    },
    progressContainer: {
      paddingHorizontal: 32,
      marginTop: 32,
    },
    progressBar: {
      height: 4,
      backgroundColor: isDark ? '#2a2a4e' : '#e0e0e0',
      borderRadius: 2,
    },
    progress: {
      height: '100%',
      backgroundColor: '#6366f1',
      borderRadius: 2,
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    time: {
      fontSize: 12,
      color: isDark ? '#888888' : '#666666',
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 48,
      marginTop: 32,
    },
    playButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#6366f1',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
