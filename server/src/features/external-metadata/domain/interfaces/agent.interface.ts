/**
 * Base interface for all external metadata agents
 * Each agent represents a third-party service (Last.fm, Fanart.tv, etc.)
 */
export interface IAgent {
  /**
   * Unique identifier for this agent
   * @example 'coverartarchive', 'lastfm', 'fanart'
   */
  readonly name: string;

  /**
   * Priority for agent execution (lower = higher priority)
   * Used when multiple agents provide the same capability
   * @example 1 = highest priority, 10 = lowest priority
   */
  readonly priority: number;

  /**
   * Check if this agent is enabled in configuration
   * @returns true if agent should be used
   */
  isEnabled(): boolean;
}
