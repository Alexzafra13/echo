import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { UploadCustomArtistImageUseCase } from '../domain/use-cases/upload-custom-artist-image';
import { ListCustomArtistImagesUseCase } from '../domain/use-cases/list-custom-artist-images';
import { DeleteCustomArtistImageUseCase } from '../domain/use-cases/delete-custom-artist-image';
import { ApplyCustomArtistImageUseCase } from '../domain/use-cases/apply-custom-artist-image';

@ApiTags('Admin - Custom Artist Images')
@ApiBearerAuth()
@Controller('admin/metadata/artist/custom-images')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CustomArtistImagesController {
  constructor(
    private readonly uploadCustomImage: UploadCustomArtistImageUseCase,
    private readonly listCustomImages: ListCustomArtistImagesUseCase,
    private readonly deleteCustomImage: DeleteCustomArtistImageUseCase,
    private readonly applyCustomImage: ApplyCustomArtistImageUseCase,
  ) {}

  @Get(':artistId')
  @ApiOperation({
    summary: 'List custom images for an artist',
    description: 'Get all custom uploaded images for a specific artist',
  })
  async listImages(@Param('artistId') artistId: string) {
    return await this.listCustomImages.execute({ artistId });
  }

  @Post(':artistId/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload custom artist image',
    description: 'Upload a custom image for an artist (profile, background, banner, or logo)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        imageType: {
          type: 'string',
          enum: ['profile', 'background', 'banner', 'logo'],
        },
      },
    },
  })
  async uploadImage(
    @Param('artistId') artistId: string,
    @Body('imageType') imageType: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    return await this.uploadCustomImage.execute({
      artistId,
      imageType: imageType as any,
      file,
      uploadedBy: req.user.id,
    });
  }

  @Post(':artistId/apply/:customImageId')
  @ApiOperation({
    summary: 'Apply custom image',
    description: 'Set a custom image as the active image for the artist',
  })
  async applyImage(
    @Param('artistId') artistId: string,
    @Param('customImageId') customImageId: string,
  ) {
    return await this.applyCustomImage.execute({
      artistId,
      customImageId,
    });
  }

  @Delete(':artistId/:customImageId')
  @ApiOperation({
    summary: 'Delete custom image',
    description: 'Delete a custom uploaded image',
  })
  async deleteImage(
    @Param('artistId') artistId: string,
    @Param('customImageId') customImageId: string,
  ) {
    return await this.deleteCustomImage.execute({
      artistId,
      customImageId,
    });
  }
}
