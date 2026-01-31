/**
 * useDjFlow Hook
 *
 * Main hook for DJ Flow functionality.
 * Provides track analysis, queue reordering, and transition info.
 */

import { useCallback, useMemo } from 'react';
import { useDjFlowStore, useDjFlowEnabled } from '../store/djFlowStore';
import { useTrackAnalysis } from './useTrackAnalysis';
import { useCompatibleTracks, getCompatibilityIndicator } from './useCompatibleTracks';
import { djService } from '../services/dj.service';
import type { Track } from '@shared/types/track.types';
import type { DjAnalysis, TransitionResult, TrackCompatibility } from '../types';

interface UseDjFlowOptions {
  currentTrack: Track | null;
  nextTrack: Track | null;
  queue: Track[];
}

interface DjFlowInfo {
  // Current track info
  currentAnalysis: DjAnalysis | null;
  isCurrentAnalyzing: boolean;

  // Next track info
  nextAnalysis: DjAnalysis | null;
  isNextAnalyzing: boolean;

  // Compatibility between current and next
  compatibility: TrackCompatibility | null;
  compatibilityIndicator: { emoji: string; label: string; color: string } | null;

  // Transition info
  transition: TransitionResult | null;

  // Suggested queue order (if reordering enabled)
  suggestedOrder: Track[] | null;

  // Actions
  triggerAnalysis: (trackId: string) => void;
}

/**
 * Main DJ Flow hook
 */
export function useDjFlow(options: UseDjFlowOptions): DjFlowInfo {
  const { currentTrack, nextTrack, queue } = options;

  const djFlowEnabled = useDjFlowEnabled();
  const settings = useDjFlowStore((state) => state.settings);
  const getTransitionFromCache = useDjFlowStore((state) => state.getTransition);
  const setTransition = useDjFlowStore((state) => state.setTransition);

  // Get analysis for current track
  const {
    analysis: currentAnalysis,
    isAnalyzing: isCurrentAnalyzing,
  } = useTrackAnalysis(currentTrack?.id, {
    autoAnalyze: true,
    onlyWhenEnabled: true,
  });

  // Get analysis for next track
  const {
    analysis: nextAnalysis,
    isAnalyzing: isNextAnalyzing,
  } = useTrackAnalysis(nextTrack?.id, {
    autoAnalyze: true,
    onlyWhenEnabled: true,
  });

  // Get compatible tracks for current track
  const { compatibleTracks } = useCompatibleTracks(currentTrack?.id, {
    onlyWhenEnabled: true,
    limit: 50,
  });

  // Find compatibility info for the next track
  const compatibility = useMemo(() => {
    if (!nextTrack || !compatibleTracks.length) return null;
    return compatibleTracks.find((t) => t.trackId === nextTrack.id) ?? null;
  }, [nextTrack, compatibleTracks]);

  // Get compatibility indicator
  const compatibilityIndicator = useMemo(() => {
    if (!compatibility) return null;
    return getCompatibilityIndicator(compatibility.overallScore);
  }, [compatibility]);

  // Get cached transition or calculate
  const transition = useMemo(() => {
    if (!currentTrack?.id || !nextTrack?.id || !djFlowEnabled) return null;

    // Check cache first
    const cached = getTransitionFromCache(currentTrack.id, nextTrack.id);
    if (cached) return cached;

    // We'll fetch transition asynchronously
    return null;
  }, [currentTrack?.id, nextTrack?.id, djFlowEnabled, getTransitionFromCache]);

  // Fetch transition if not cached (async effect handled separately)
  const fetchTransition = useCallback(async () => {
    if (!currentTrack?.id || !nextTrack?.id || !djFlowEnabled) return;
    if (getTransitionFromCache(currentTrack.id, nextTrack.id)) return;

    try {
      const result = await djService.calculateTransition({
        trackAId: currentTrack.id,
        trackBId: nextTrack.id,
        durationBeats: settings.transitionBeats,
      });

      setTransition(`${currentTrack.id}-${nextTrack.id}`, result);
    } catch {
      // Silently fail - transition info is optional
    }
  }, [
    currentTrack?.id,
    nextTrack?.id,
    djFlowEnabled,
    settings.transitionBeats,
    getTransitionFromCache,
    setTransition,
  ]);

  // Calculate suggested queue order
  const suggestedOrder = useMemo(() => {
    if (!djFlowEnabled || !settings.reorderQueue || queue.length < 2) {
      return null;
    }

    // For now, return null - full reordering logic would go here
    // This would sort the queue based on harmonic compatibility
    // Starting from the first track and finding the best next match each time
    return null;
  }, [djFlowEnabled, settings.reorderQueue, queue]);

  // Trigger analysis action
  const triggerAnalysis = useCallback(
    (trackId: string) => {
      djService.analyzeTrack(trackId);
    },
    []
  );

  // Trigger transition fetch when tracks change
  useMemo(() => {
    if (currentTrack?.id && nextTrack?.id && djFlowEnabled) {
      fetchTransition();
    }
  }, [currentTrack?.id, nextTrack?.id, djFlowEnabled, fetchTransition]);

  return {
    currentAnalysis: currentAnalysis ?? null,
    isCurrentAnalyzing,
    nextAnalysis: nextAnalysis ?? null,
    isNextAnalyzing,
    compatibility,
    compatibilityIndicator,
    transition,
    suggestedOrder,
    triggerAnalysis,
  };
}

/**
 * Format BPM for display
 */
export function formatBpm(bpm: number | null | undefined): string {
  if (bpm === null || bpm === undefined || bpm === 0) return '—';
  return Math.round(bpm).toString();
}

/**
 * Format key for display
 */
export function formatKey(key: string | null | undefined): string {
  if (!key || key === 'Unknown') return '—';
  return key;
}

/**
 * Format energy as percentage
 */
export function formatEnergy(energy: number | null | undefined): string {
  if (energy === null || energy === undefined) return '—';
  return `${Math.round(energy * 100)}%`;
}

/**
 * Get Camelot wheel color for a key
 */
export function getCamelotColor(camelotKey: string | null | undefined): string {
  if (!camelotKey) return '#6b7280'; // gray

  const colors: Record<string, string> = {
    '1A': '#ef4444', '1B': '#ef4444', // Red
    '2A': '#f97316', '2B': '#f97316', // Orange
    '3A': '#f59e0b', '3B': '#f59e0b', // Amber
    '4A': '#eab308', '4B': '#eab308', // Yellow
    '5A': '#84cc16', '5B': '#84cc16', // Lime
    '6A': '#22c55e', '6B': '#22c55e', // Green
    '7A': '#14b8a6', '7B': '#14b8a6', // Teal
    '8A': '#06b6d4', '8B': '#06b6d4', // Cyan
    '9A': '#3b82f6', '9B': '#3b82f6', // Blue
    '10A': '#6366f1', '10B': '#6366f1', // Indigo
    '11A': '#8b5cf6', '11B': '#8b5cf6', // Violet
    '12A': '#d946ef', '12B': '#d946ef', // Fuchsia
  };

  return colors[camelotKey] || '#6b7280';
}
