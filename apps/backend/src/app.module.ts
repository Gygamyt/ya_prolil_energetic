import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import healthConfig from './config/health.config';
import { HealthModule } from './health/health.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [healthConfig],
        }),
        HealthModule,
    ],
})
export class AppModule {}
