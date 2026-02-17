// Contrato para gestionar tokens invalidados (blacklist)
export interface ITokenBlacklistService {
  add(tokenOrJti: string, expiresAt: number): Promise<void>;
  isBlacklisted(tokenOrJti: string): Promise<boolean>;
}

export const TOKEN_BLACKLIST_SERVICE = 'ITokenBlacklistService';
