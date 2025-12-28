import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { IAgent, IAgentRegistry } from '../../domain/interfaces';

/**
 * Agent Registry Service
 * Manages registration and discovery of external metadata agents
 *
 * Design Pattern: Registry Pattern
 * Purpose: Central management of all metadata retrieval agents with type-safe discovery
 */
@Injectable()
export class AgentRegistryService implements IAgentRegistry {
  constructor(
    @InjectPinoLogger(AgentRegistryService.name)
    private readonly logger: PinoLogger,
  ) {}

  private readonly agents = new Map<string, IAgent>();

  /**
   * Register a new agent in the registry
   * @param agent The agent to register
   */
  register(agent: IAgent): void {
    if (this.agents.has(agent.name)) {
      this.logger.warn(`Agent "${agent.name}" is already registered. Skipping.`);
      return;
    }

    this.agents.set(agent.name, agent);
    this.logger.info(
      `Registered agent: ${agent.name} (priority: ${agent.priority}, enabled: ${agent.isEnabled()})`
    );
  }

  /**
   * Get all agents that implement a specific interface
   * Returns agents sorted by priority (lower number = higher priority)
   *
   * @param interfaceName The interface name to filter by (e.g., 'IArtistBioRetriever')
   * @returns Array of agents implementing the interface, sorted by priority
   */
  getAgentsFor<T extends IAgent>(interfaceName: string): T[] {
    const agents = Array.from(this.agents.values())
      .filter((agent) => this.implementsInterface(agent, interfaceName))
      .filter((agent) => agent.isEnabled())
      .sort((a, b) => a.priority - b.priority) as T[];

    this.logger.debug(
      `Found ${agents.length} enabled agents for ${interfaceName}: ${agents.map(a => a.name).join(', ')}`
    );

    return agents;
  }

  /**
   * Check if a specific agent is enabled
   * @param agentName The name of the agent to check
   * @returns true if the agent exists and is enabled, false otherwise
   */
  isAgentEnabled(agentName: string): boolean {
    const agent = this.agents.get(agentName);
    return agent ? agent.isEnabled() : false;
  }

  /**
   * Get all registered agents
   * @returns Array of all registered agents
   */
  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get a specific agent by name
   * @param agentName The name of the agent
   * @returns The agent or undefined if not found
   */
  getAgent(agentName: string): IAgent | undefined {
    return this.agents.get(agentName);
  }

  /**
   * Get count of registered agents
   * @returns Total number of registered agents
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Get count of enabled agents
   * @returns Number of currently enabled agents
   */
  getEnabledAgentCount(): number {
    return Array.from(this.agents.values()).filter((agent) => agent.isEnabled()).length;
  }

  /**
   * Check if an agent implements a specific interface
   * Uses duck typing to check for interface implementation
   *
   * @param agent The agent to check
   * @param interfaceName The interface name
   * @returns true if the agent implements the interface
   */
  private implementsInterface(agent: IAgent, interfaceName: string): boolean {
    switch (interfaceName) {
      case 'IArtistBioRetriever':
        return 'getArtistBio' in agent;
      case 'IArtistImageRetriever':
        return 'getArtistImages' in agent;
      case 'IAlbumCoverRetriever':
        return 'getAlbumCover' in agent;
      case 'IMusicBrainzSearch':
        return 'searchArtist' in agent && 'searchAlbum' in agent;
      default:
        this.logger.warn(`Unknown interface: ${interfaceName}`);
        return false;
    }
  }
}
