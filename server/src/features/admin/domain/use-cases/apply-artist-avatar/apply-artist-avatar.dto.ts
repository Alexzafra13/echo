export interface ApplyArtistAvatarInput {
  artistId: string;
  avatarUrl: string;
  provider: string;
  type: 'profile' | 'background' | 'banner' | 'logo';
  replaceLocal?: boolean; // Optional: clear local image reference (default: true)
}

export interface ApplyArtistAvatarOutput {
  success: boolean;
  message: string;
  imagePath?: string;
}
