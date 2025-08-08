import { Injectable } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator, HttpHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class HealthService {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
        private http: HttpHealthIndicator,
    ) {}

    check() {
        return this.health.check([
            async () => this.db.pingCheck('database'),
            async () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
        ]);
    }
}
