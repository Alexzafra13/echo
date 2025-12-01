// List banners
export interface ListArtistBannersInput {
  artistId: string;
}

export interface BannerItem {
  id: string;
  artistId: string;
  imageUrl: string;
  provider: string;
  order: number;
  createdAt: Date;
}

export interface ListArtistBannersOutput {
  banners: BannerItem[];
}

// Add banner
export interface AddArtistBannerInput {
  artistId: string;
  bannerUrl: string;
  provider: string;
}

export interface AddArtistBannerOutput {
  success: boolean;
  message: string;
  bannerId: string;
}

// Delete banner
export interface DeleteArtistBannerInput {
  bannerId: string;
}

export interface DeleteArtistBannerOutput {
  success: boolean;
  message: string;
}
