const swaggerJS = require('swagger-jsdoc');

const option = {
    definition: {
        openapi: '3.0.0',

        info: {
            title: 'Solar Generation API',
            version: '1.0.0',
            description: 'API Documentation for Solar Monitoring Application'
        },

        servers: [
            {
                url: 'http://localhost:5000'
                //url: 'http://localhost:5000'
            }
        ],

        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-KEY'
                },

                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },

    apis: ['./routers/*.js']
};

const swaggerSpec = swaggerJS(option);

module.exports = swaggerSpec;