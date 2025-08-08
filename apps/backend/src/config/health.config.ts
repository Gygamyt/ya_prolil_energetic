export default () => ({
    health: {
        externalUrl: process.env.HEALTH_EXTERNAL_URL || 'https://docs.nestjs.com',
    },
});
