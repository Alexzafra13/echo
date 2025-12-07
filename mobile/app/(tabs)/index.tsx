import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const styles = createStyles(isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.greeting}>Buenas tardes</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Escuchado recientemente</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Contenido próximamente</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendaciones</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Contenido próximamente</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5',
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
    },
    greeting: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#000000',
      marginTop: 16,
      marginBottom: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#000000',
      marginBottom: 12,
    },
    placeholder: {
      backgroundColor: isDark ? '#2a2a4e' : '#e0e0e0',
      borderRadius: 12,
      padding: 40,
      alignItems: 'center',
    },
    placeholderText: {
      color: isDark ? '#888888' : '#666666',
    },
  });
