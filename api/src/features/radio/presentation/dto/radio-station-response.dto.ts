import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RadioStation } from '../../domain/entities/radio-station.entity';

/**
 * DTO de respuesta para RadioStation
 */
export class RadioStationResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the radio station',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'UUID from Radio Browser API',
    example: '96202c52-e145-4c78-87c0-a1b2c3d4e5f6',
  })
  stationUuid?: string;

  @ApiProperty({ description: 'Name of the radio station', example: 'Jazz FM' })
  name!: string;

  @ApiProperty({
    description: 'Stream URL of the radio station',
    example: 'https://stream.jazzfm.com/live',
  })
  url!: string;

  @ApiPropertyOptional({
    description: 'Resolved stream URL after redirects',
    example: 'https://cdn.jazzfm.com/live.mp3',
  })
  urlResolved?: string;

  @ApiPropertyOptional({
    description: 'Homepage URL of the radio station',
    example: 'https://jazzfm.com',
  })
  homepage?: string;

  @ApiPropertyOptional({
    description: 'URL of the station favicon or logo',
    example: 'https://jazzfm.com/favicon.ico',
  })
  favicon?: string;

  @ApiPropertyOptional({
    description: 'Custom favicon URL uploaded by the user',
    example: 'https://cdn.echo.app/favicons/custom123.png',
  })
  customFaviconUrl?: string;

  @ApiPropertyOptional({
    description: 'Country where the station is based',
    example: 'United Kingdom',
  })
  country?: string;

  @ApiPropertyOptional({ description: 'ISO country code', example: 'GB' })
  countryCode?: string;

  @ApiPropertyOptional({ description: 'State or region of the station', example: 'London' })
  state?: string;

  @ApiPropertyOptional({ description: 'Language of the station broadcast', example: 'english' })
  language?: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the station',
    example: ['jazz', 'smooth', 'instrumental'],
    type: [String],
  })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Audio codec used by the stream', example: 'MP3' })
  codec?: string;

  @ApiPropertyOptional({ description: 'Bitrate of the stream in kbps', example: 128 })
  bitrate?: number;

  @ApiPropertyOptional({ description: 'Number of votes from Radio Browser', example: 42 })
  votes?: number;

  @ApiPropertyOptional({ description: 'Total click count', example: 1500 })
  clickCount?: number;

  @ApiPropertyOptional({ description: 'Whether the last health check passed', example: true })
  lastCheckOk?: boolean;

  @ApiProperty({
    description: 'Source of the station',
    enum: ['radio-browser', 'custom'],
    example: 'radio-browser',
  })
  source!: 'radio-browser' | 'custom';

  @ApiProperty({ description: 'Whether the station is marked as favorite', example: false })
  isFavorite!: boolean;

  @ApiProperty({ description: 'Creation timestamp', example: '2025-01-15T10:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2025-01-20T14:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(station: RadioStation, customFaviconUrl?: string): RadioStationResponseDto {
    return {
      id: station.id,
      stationUuid: station.stationUuid,
      name: station.name,
      url: station.url,
      urlResolved: station.urlResolved,
      homepage: station.homepage,
      favicon: station.favicon,
      customFaviconUrl,
      country: station.country,
      countryCode: station.countryCode,
      state: station.state,
      language: station.language,
      tags: station.getTagsArray(),
      codec: station.codec,
      bitrate: station.bitrate,
      votes: station.votes,
      clickCount: station.clickCount,
      lastCheckOk: station.lastCheckOk,
      source: station.source,
      isFavorite: station.isFavorite,
      createdAt: station.createdAt,
      updatedAt: station.updatedAt,
    };
  }

  static fromDomainArray(
    stations: RadioStation[],
    customFaviconMap?: Map<string, string>
  ): RadioStationResponseDto[] {
    return stations.map((station) => {
      const customUrl =
        station.stationUuid && customFaviconMap
          ? customFaviconMap.get(station.stationUuid)
          : undefined;
      return this.fromDomain(station, customUrl);
    });
  }
}
