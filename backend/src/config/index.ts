import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import jwtConfig from './jwt.config';

export const configModules = [appConfig, databaseConfig, redisConfig, jwtConfig];
export { appConfig, databaseConfig, redisConfig, jwtConfig };
