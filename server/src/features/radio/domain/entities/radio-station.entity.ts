import { generateUuid } from '@shared/utils';

/**
 * Interfaz que define la estructura de propiedades de RadioStation
 */
export interface RadioStationProps {
  id: string;
  userId: string; // Usuario propietario del favorito
  stationUuid?: string; // UUID de Radio Browser API (null si es custom)
  name: string;
  url: string; // Stream URL
  urlResolved?: string; // URL final después de redirects
  homepage?: string;
  favicon?: string; // Logo de la emisora
  country?: string;
  countryCode?: string;
  state?: string;
  language?: string;
  tags?: string; // Géneros separados por coma: "rock,pop,top40"
  codec?: string; // "MP3", "AAC"
  bitrate?: number; // kbps
  votes?: number;
  clickCount?: number;
  lastCheckOk?: boolean; // Si está online
  source: 'radio-browser' | 'custom'; // Origen de la emisora
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RadioStation Entity - Representa una emisora de radio en el dominio
 *
 * Responsabilidades:
 * - Encapsular las propiedades de una emisora
 * - Proporcionar getters para acceder a los datos
 * - Crear nuevas emisoras con factory method
 * - Convertir a primitivos (para mapear a BD o DTOs)
 */
export class RadioStation {
  private props: RadioStationProps;

  /**
   * Constructor privado - no llamar directamente
   * Usar RadioStation.create() o RadioStation.createFromAPI() en su lugar
   */
  constructor(props: RadioStationProps) {
    this.props = props;
  }

  /**
   * Factory method para crear una emisora personalizada (custom)
   */
  static createCustom(
    props: Omit<
      RadioStationProps,
      | 'id'
      | 'source'
      | 'stationUuid'
      | 'isFavorite'
      | 'createdAt'
      | 'updatedAt'
    >,
  ): RadioStation {
    return new RadioStation({
      ...props,
      id: generateUuid(),
      source: 'custom',
      stationUuid: undefined,
      isFavorite: true, // Custom stations are favorites by default
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Factory method para crear emisora desde Radio Browser API
   */
  static createFromAPI(
    userId: string,
    apiData: {
      stationuuid: string;
      name: string;
      url: string;
      url_resolved?: string;
      homepage?: string;
      favicon?: string;
      country?: string;
      countrycode?: string;
      state?: string;
      language?: string;
      tags?: string;
      codec?: string;
      bitrate?: number;
      votes?: number;
      clickcount?: number;
      lastcheckok?: boolean;
    },
  ): RadioStation {
    return new RadioStation({
      id: generateUuid(),
      userId,
      stationUuid: apiData.stationuuid,
      name: apiData.name,
      url: apiData.url,
      urlResolved: apiData.url_resolved,
      homepage: apiData.homepage,
      favicon: apiData.favicon,
      country: apiData.country,
      countryCode: apiData.countrycode,
      state: apiData.state,
      language: apiData.language,
      tags: apiData.tags,
      codec: apiData.codec,
      bitrate: apiData.bitrate,
      votes: apiData.votes,
      clickCount: apiData.clickcount,
      lastCheckOk: apiData.lastcheckok,
      source: 'radio-browser',
      isFavorite: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Factory method para reconstruir una RadioStation desde BD
   */
  static reconstruct(props: RadioStationProps): RadioStation {
    return new RadioStation(props);
  }

  // ============ GETTERS (Solo lectura) ============

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get stationUuid(): string | undefined {
    return this.props.stationUuid;
  }

  get name(): string {
    return this.props.name;
  }

  get url(): string {
    return this.props.url;
  }

  get urlResolved(): string | undefined {
    return this.props.urlResolved;
  }

  get homepage(): string | undefined {
    return this.props.homepage;
  }

  get favicon(): string | undefined {
    return this.props.favicon;
  }

  get country(): string | undefined {
    return this.props.country;
  }

  get countryCode(): string | undefined {
    return this.props.countryCode;
  }

  get state(): string | undefined {
    return this.props.state;
  }

  get language(): string | undefined {
    return this.props.language;
  }

  get tags(): string | undefined {
    return this.props.tags;
  }

  get codec(): string | undefined {
    return this.props.codec;
  }

  get bitrate(): number | undefined {
    return this.props.bitrate;
  }

  get votes(): number | undefined {
    return this.props.votes;
  }

  get clickCount(): number | undefined {
    return this.props.clickCount;
  }

  get lastCheckOk(): boolean | undefined {
    return this.props.lastCheckOk;
  }

  get source(): 'radio-browser' | 'custom' {
    return this.props.source;
  }

  get isFavorite(): boolean {
    return this.props.isFavorite;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ============ MÉTODOS ============

  /**
   * Marcar/desmarcar como favorita
   */
  toggleFavorite(): void {
    this.props.isFavorite = !this.props.isFavorite;
    this.props.updatedAt = new Date();
  }

  /**
   * Obtener tags como array
   */
  getTagsArray(): string[] {
    return this.props.tags ? this.props.tags.split(',').map((t) => t.trim()) : [];
  }

  // ============ MÉTODOS DE CONVERSIÓN ============

  /**
   * Retorna todas las propiedades de la emisora como un objeto plano
   */
  toPrimitives(): RadioStationProps {
    return { ...this.props };
  }
}
