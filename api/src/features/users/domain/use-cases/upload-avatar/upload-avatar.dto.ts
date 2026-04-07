export interface UploadAvatarInput {
  userId: string;
  file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
    originalname?: string;
  };
}

export interface UploadAvatarOutput {
  avatarPath: string;
  avatarSize: number;
  avatarMimeType: string;
}
