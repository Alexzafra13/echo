-- Migration: Add indices for album sorting and filtering
-- Created: 2024-11-24

-- =====================================================
-- ÍNDICES PARA ORDENAMIENTO ALFABÉTICO
-- =====================================================

-- Índice para ordenar álbumes alfabéticamente (ignora "The", acentos, etc.)
CREATE INDEX IF NOT EXISTS idx_albums_order_album_name ON albums(order_album_name ASC NULLS LAST);

-- Índice para ordenar artistas alfabéticamente
CREATE INDEX IF NOT EXISTS idx_artists_order_artist_name ON artists(order_artist_name ASC NULLS LAST);

-- =====================================================
-- ÍNDICES PARA FAVORITOS DE ÁLBUMES
-- =====================================================

-- Índice parcial para álbumes favoritos (solo likes)
-- Partial index = más eficiente porque solo indexa los favoritos, no todos los starred
CREATE INDEX IF NOT EXISTS idx_user_starred_album_likes
ON user_starred(user_id, starred_at DESC)
WHERE starred_type = 'album' AND sentiment = 'like';

-- =====================================================
-- ÍNDICES PARA REPRODUCIDOS RECIENTEMENTE
-- =====================================================

-- Índice compuesto para historial de reproducciones por álbum
-- Útil para queries de "álbumes reproducidos recientemente"
CREATE INDEX IF NOT EXISTS idx_play_history_user_album
ON play_history(user_id, played_at DESC)
INCLUDE (track_id);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que los índices se crearon correctamente
DO $$
BEGIN
  RAISE NOTICE 'Índices creados exitosamente:';
  RAISE NOTICE '  - idx_albums_order_album_name';
  RAISE NOTICE '  - idx_artists_order_artist_name';
  RAISE NOTICE '  - idx_user_starred_album_likes (partial)';
  RAISE NOTICE '  - idx_play_history_user_album';
END $$;
