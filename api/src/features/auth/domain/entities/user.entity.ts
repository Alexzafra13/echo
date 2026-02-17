import { generateUuid } from '@shared/utils';
import { DateUtil } from '@shared/utils/date.util';
import { HomeSectionConfig, DEFAULT_HOME_SECTIONS } from '@shared/types/home-section.types';

export interface UserProps {
  id: string;
  username: string;
  passwordHash: string;
  name?: string;
  isActive: boolean;
  isAdmin: boolean;
  theme: string;
  language: string;
  mustChangePassword: boolean;
  avatarPath?: string;
  avatarMimeType?: string;
  avatarSize?: number;
  avatarUpdatedAt?: Date;
  lastLoginAt?: Date;
  lastAccessAt?: Date;
  isPublicProfile: boolean;
  showTopTracks: boolean;
  showTopArtists: boolean;
  showTopAlbums: boolean;
  showPlaylists: boolean;
  bio?: string;
  homeSections: HomeSectionConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  static create(
    props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt' | 'theme' | 'language' | 'lastLoginAt' | 'lastAccessAt' | 'isPublicProfile' | 'showTopTracks' | 'showTopArtists' | 'showTopAlbums' | 'showPlaylists' | 'homeSections'> & {
      theme?: string;
      language?: string;
      isPublicProfile?: boolean;
      showTopTracks?: boolean;
      showTopArtists?: boolean;
      showTopAlbums?: boolean;
      showPlaylists?: boolean;
      homeSections?: HomeSectionConfig[];
    },
  ): User {
    return new User({
      ...props,
      id: generateUuid(),
      theme: props.theme || 'dark',
      language: props.language || 'es',
      lastLoginAt: undefined,
      lastAccessAt: undefined,
      isPublicProfile: props.isPublicProfile ?? false,
      showTopTracks: props.showTopTracks ?? true,
      showTopArtists: props.showTopArtists ?? true,
      showTopAlbums: props.showTopAlbums ?? true,
      showPlaylists: props.showPlaylists ?? true,
      homeSections: props.homeSections ?? DEFAULT_HOME_SECTIONS,
      createdAt: DateUtil.now(),
      updatedAt: DateUtil.now(),
    });
  }

  static reconstruct(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get username(): string {
    return this.props.username;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get name(): string | undefined {
    return this.props.name;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isAdmin(): boolean {
    return this.props.isAdmin;
  }

  get theme(): string {
    return this.props.theme;
  }

  get language(): string {
    return this.props.language;
  }

  get mustChangePassword(): boolean {
    return this.props.mustChangePassword;
  }

  get avatarPath(): string | undefined {
    return this.props.avatarPath;
  }

  get avatarMimeType(): string | undefined {
    return this.props.avatarMimeType;
  }

  get avatarSize(): number | undefined {
    return this.props.avatarSize;
  }

  get avatarUpdatedAt(): Date | undefined {
    return this.props.avatarUpdatedAt;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get lastAccessAt(): Date | undefined {
    return this.props.lastAccessAt;
  }

  get isPublicProfile(): boolean {
    return this.props.isPublicProfile;
  }

  get showTopTracks(): boolean {
    return this.props.showTopTracks;
  }

  get showTopArtists(): boolean {
    return this.props.showTopArtists;
  }

  get showTopAlbums(): boolean {
    return this.props.showTopAlbums;
  }

  get showPlaylists(): boolean {
    return this.props.showPlaylists;
  }

  get bio(): string | undefined {
    return this.props.bio;
  }

  get homeSections(): HomeSectionConfig[] {
    return this.props.homeSections;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toPrimitives(): UserProps {
    return { ...this.props };
  }
}