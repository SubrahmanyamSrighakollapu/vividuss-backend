
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Website Builder API",
      version: "1.0.0",
      description:
        "API documentation for the Internship Project Website Builder.",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter a valid authentication token if the endpoint requires authentication.",
        },
      },
    },
  },

  apis: [
  "./src/routes/*.js",
  "./src/server.js",
],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
