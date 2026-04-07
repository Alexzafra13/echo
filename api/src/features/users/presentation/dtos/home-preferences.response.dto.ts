import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateHomePreferencesOutput } from '../../domain/use-cases/update-home-preferences';
import { HomeSectionConfigDto } from './update-home-preferences.request.dto';

export class HomePreferencesResponseDto {
  @ApiProperty({
    description: 'Configuración de las secciones del home',
    type: [HomeSectionConfigDto],
  })
  @Expose()
  @Type(() => HomeSectionConfigDto)
  homeSections!: HomeSectionConfigDto[];

  static fromDomain(data: UpdateHomePreferencesOutput): HomePreferencesResponseDto {
    const dto = new HomePreferencesResponseDto();
    dto.homeSections = data.homeSections;
    return dto;
  }
}
