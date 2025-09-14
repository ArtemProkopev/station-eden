import { DataSource } from 'typeorm';
import { User } from './src/users/user.entity';
import { RefreshToken } from './src/auth/refresh-token.entity';
import 'dotenv/config';
export default new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT || 5432),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [User, RefreshToken],
    synchronize: false,
    migrations: ['apps/api/migrations/*.ts'],
});
