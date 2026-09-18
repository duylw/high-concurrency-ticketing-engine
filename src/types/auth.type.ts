export type Role = "USER" | "ORGANIZER" | "ADMIN" | "MODERATOR";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  username?: string;
  name?: string | null;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
