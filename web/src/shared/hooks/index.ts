export { useAuth } from './useAuth';
export { useAutoRefreshOnScan } from './useAutoRefreshOnScan';
export { useTheme } from './useTheme';
export { useWebSocketConnection } from './useWebSocketConnection';
export type { WebSocketNamespace, WebSocketEventHandler, UseWebSocketConnectionOptions, UseWebSocketConnectionReturn } from './useWebSocketConnection';
export { useScannerWebSocket } from './useScannerWebSocket';
export { useLufsProgress } from './useLufsProgress';
export type { LufsProgress } from './useLufsProgress';
export { useMetadataEnrichment } from './useMetadataEnrichment';
export type { EnrichmentNotification, EnrichmentProgress } from './useMetadataEnrichment';
// SSE-based metadata hooks (recommended)
export { useMetadataSSE, useArtistMetadataSSE, useAlbumMetadataSSE } from './useMetadataSSE';
export type { MetadataEventType, ArtistImagesUpdatedEvent, AlbumCoverUpdatedEvent, CacheInvalidationEvent, MetadataSSEHandlers } from './useMetadataSSE';
// Convenience wrappers (use SSE internally)
export { useArtistMetadataSync } from './useArtistMetadataSync';
export { useAlbumMetadataSync } from './useAlbumMetadataSync';
export { useDropdownPosition } from './useDropdownPosition';
export { useDropdownMenu } from './useDropdownMenu';
export type { UseDropdownMenuOptions, UseDropdownMenuReturn } from './useDropdownMenu';
export { useFileUpload } from './useFileUpload';
export type { FileUploadOptions, FileUploadState, FileUploadActions, UseFileUploadReturn } from './useFileUpload';
export { useScrollDetection } from './useScrollDetection';
export type { UseScrollDetectionOptions, UseScrollDetectionReturn } from './useScrollDetection';
export { useClickOutside } from './useClickOutside';
export type { UseClickOutsideOptions, UseClickOutsideReturn } from './useClickOutside';
export { useShufflePlay } from './useShufflePlay';
export type { UseShufflePlayReturn } from './useShufflePlay';
