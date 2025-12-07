import { View, Text, TextInput, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search as SearchIcon } from 'lucide-react-native';

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const styles = createStyles(isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
        <View style={styles.searchContainer}>
          <SearchIcon size={20} color={isDark ? '#888888' : '#666666'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Canciones, álbumes, artistas..."
            placeholderTextColor={isDark ? '#666666' : '#999999'}
          />
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>
          Busca tu música favorita
        </Text>
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
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#000000',
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#2a2a4e' : '#ffffff',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: isDark ? '#ffffff' : '#000000',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      color: isDark ? '#888888' : '#666666',
    },
  });
