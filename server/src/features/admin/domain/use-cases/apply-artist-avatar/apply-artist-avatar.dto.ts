export interface ApplyArtistAvatarInput {
  artistId: string;
  avatarUrl: string;
  provider: string;
  type: 'profile' | 'background' | 'banner' | 'logo';
}

export interface ApplyArtistAvatarOutput {
  success: boolean;
  message: string;
  imagePath?: string;
}
