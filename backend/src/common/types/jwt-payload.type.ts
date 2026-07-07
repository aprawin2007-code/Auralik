export interface JwtPayload {
  sub: string; // AnonymousUser ID
  nickname?: string;
  role?: string;
}
