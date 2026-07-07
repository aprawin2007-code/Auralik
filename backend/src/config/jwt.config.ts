import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production',
  expiresIn: process.env.JWT_EXPIRATION || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_change_in_production',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
