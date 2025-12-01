import { IAgent } from './agent.interface';

/**
 * Registry for managing external metadata agents
 * Handles registration, discovery, and filtering of agents
 */
export interface IAgentRegistry {
  /**
   * Register an agent in the registry
   * @param agent Agent instance to register
   */
  register(agent: IAgent): void;

  /**
   * Get all agents that implement a specific capability
   * Returns agents sorted by priority (lower = first)
   * @param interfaceName Name of the interface to filter by
   * @returns Array of enabled agents implementing the interface
   * @example getAgentsFor<IArtistBioRetriever>('IArtistBioRetriever')
   */
  getAgentsFor<T extends IAgent>(interfaceName: string): T[];

  /**
   * Check if a specific agent is enabled
   * @param agentName Name of the agent to check
   * @returns true if agent is enabled in configuration
   */
  isAgentEnabled(agentName: string): boolean;

  /**
   * Get all registered agents
   * @returns Array of all agents (enabled and disabled)
   */
  getAllAgents(): IAgent[];
}
