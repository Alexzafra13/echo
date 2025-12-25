import { Expose, Type } from 'class-transformer';
import { SearchAlbumCoversOutput } from '../../infrastructure/use-cases/search-album-covers';

export class CoverOptionDto {
  @Expose()
  provider!: string;

  @Expose()
  url!: string;

  @Expose()
  thumbnailUrl?: string;

  @Expose()
  width?: number;

  @Expose()
  height?: number;

  @Expose()
  size?: string;
}

export class AlbumInfoDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  artistName!: string;

  @Expose()
  mbzAlbumId?: string;
}

export class SearchAlbumCoversResponseDto {
  @Expose()
  @Type(() => CoverOptionDto)
  covers!: CoverOptionDto[];

  @Expose()
  @Type(() => AlbumInfoDto)
  albumInfo!: AlbumInfoDto;

  static fromDomain(data: SearchAlbumCoversOutput): SearchAlbumCoversResponseDto {
    const dto = new SearchAlbumCoversResponseDto();
    dto.covers = data.covers.map((cover) => {
      const coverDto = new CoverOptionDto();
      coverDto.provider = cover.provider;
      coverDto.url = cover.url;
      coverDto.thumbnailUrl = cover.thumbnailUrl;
      coverDto.width = cover.width;
      coverDto.height = cover.height;
      coverDto.size = cover.size;
      return coverDto;
    });

    const infoDto = new AlbumInfoDto();
    infoDto.id = data.albumInfo.id;
    infoDto.name = data.albumInfo.name;
    infoDto.artistName = data.albumInfo.artistName;
    infoDto.mbzAlbumId = data.albumInfo.mbzAlbumId;
    dto.albumInfo = infoDto;

    return dto;
  }
}
