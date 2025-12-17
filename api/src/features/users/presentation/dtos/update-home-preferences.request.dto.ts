import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const VALID_SECTION_IDS = [
  'recent-albums',
  'artist-mix',
  'genre-mix',
  'recently-played',
  'my-playlists',
  'top-played',
  'favorite-radios',
  'surprise-me',
  'shared-albums',
] as const;

export class HomeSectionConfigDto {
  @ApiProperty({
    description: 'ID de la sección',
    enum: VALID_SECTION_IDS,
    example: 'recent-albums',
  })
  @IsIn(VALID_SECTION_IDS)
  id!: typeof VALID_SECTION_IDS[number];

  @ApiProperty({
    description: 'Si la sección está habilitada',
    example: true,
  })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({
    description: 'Orden de la sección (0 = primera)',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  order!: number;
}

export class UpdateHomePreferencesRequestDto {
  @ApiProperty({
    description: 'Configuración de las secciones del home',
    type: [HomeSectionConfigDto],
    example: [
      { id: 'recent-albums', enabled: true, order: 0 },
      { id: 'artist-mix', enabled: true, order: 1 },
      { id: 'genre-mix', enabled: false, order: 2 },
      { id: 'recently-played', enabled: false, order: 3 },
      { id: 'my-playlists', enabled: false, order: 4 },
      { id: 'top-played', enabled: false, order: 5 },
      { id: 'favorite-radios', enabled: false, order: 6 },
      { id: 'surprise-me', enabled: false, order: 7 },
      { id: 'shared-albums', enabled: false, order: 8 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeSectionConfigDto)
  homeSections!: HomeSectionConfigDto[];
}
