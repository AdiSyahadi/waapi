const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp API - Admin Documentation',
      version: '1.0.0',
      description: `
## WhatsApp API - Admin Panel Documentation

🔒 **Admin Access Only** - This documentation contains administrative endpoints for system management.

### Admin Features
- 👥 **User Management**: Manage users, roles, and permissions
- 📊 **Analytics**: View system-wide analytics and reports
- 🏢 **Organization Management**: Manage organizations and subscriptions
- 💳 **Billing Management**: Handle subscriptions and payments
- 🔧 **System Configuration**: Configure system settings

### Authentication
Admin endpoints require Bearer token with admin role:
\`\`\`
Authorization: Bearer <admin_jwt_token>
\`\`\`

### Support
- Email: support@whatsapp-api.com
- Documentation: https://docs.whatsapp-api.com
      `,
      contact: {
        name: 'API Support',
        email: 'support@whatsapp-api.com',
        url: 'https://whatsapp-api.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: `🔒 **Admin Access Required** - JWT token with admin role is required for all admin endpoints.`
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: { type: 'array', items: { type: 'object' } }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Unauthorized - Invalid or missing token'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied - Admin role required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Forbidden - Admin access required'
              }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // Only load admin and analytics docs
  apis: [
    './src/docs/admin.docs.js',
    './src/docs/analytics.docs.js'
  ]
};

const swaggerAdminSpec = swaggerJsdoc(options);

module.exports = swaggerAdminSpec;
