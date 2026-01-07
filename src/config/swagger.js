const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp API - SaaS Platform',
      version: '1.0.0',
      description: `
## WhatsApp REST API Documentation

A production-ready WhatsApp API for SaaS applications. Send messages, manage groups, 
handle contacts, and automate WhatsApp communications at scale.

### Features
- 🔐 **Authentication**: JWT-based auth with 2FA support
- 📱 **Multi-Session**: Connect multiple WhatsApp accounts
- 💬 **Messaging**: Text, images, documents, audio, video, location, contacts
- 👥 **Groups**: Create, manage, and broadcast to groups
- 📞 **Contacts**: Manage and validate WhatsApp contacts
- 🔔 **Webhooks**: Real-time event notifications
- ⏰ **Scheduling**: Schedule and bulk send messages
- 📊 **Admin Panel**: User management and analytics

### Authentication
All API endpoints (except auth) require a Bearer token:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

### Rate Limiting
- Free Plan: 100 requests/minute
- Pro Plan: 500 requests/minute  
- Enterprise: Unlimited

### Support
- Email: support@whatsapp-api.com
- Documentation: https://docs.whatsapp-api.com
      `,
      contact: {
        name: 'API Support',
        email: 'support@whatsapp-api.com',
        url: 'https://whatsapp-api.com'
      },
      license: {
        name: 'Proprietary',
        url: 'https://whatsapp-api.com/license'
      }
    },
    servers: [
      {
        url: process.env.APP_URL || 'http://localhost:3000',
        description: 'Current Server'
      },
      {
        url: 'https://api.whatsapp-api.com',
        description: 'Production Server'
      }
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Sessions', description: 'WhatsApp session management' },
      { name: 'Messages', description: 'Send and manage messages' },
      { name: 'Templates', description: 'Message template management' },
      { name: 'Broadcast', description: 'Bulk messaging and broadcasts' },
      { name: 'Chat', description: 'Chat and conversation management' },
      { name: 'Groups', description: 'WhatsApp group management' },
      { name: 'Contacts', description: 'Contact management and validation' },
      { name: 'Webhooks', description: 'Webhook configuration and logs' },
      { name: 'Schedule', description: 'Message scheduling and bulk operations' },
      { name: 'Admin', description: 'Admin panel operations (admin only)' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '🔒 **Dashboard Use Only** - JWT token is automatically provided when you login to the web dashboard. This auth method is for internal dashboard operations only and is NOT recommended for external API integrations.'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: '🔑 **Recommended for API Access** - Generate your API Key from the dashboard (Dashboard → API Keys menu). Use this for all external integrations and programmatic API access. Format: `wapi_xxxxxxxxxxxxxx`'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            error: { type: 'string', example: 'Detailed error' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total_pages: { type: 'integer', example: 5 }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user', 'developer'] },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending'] },
            email_verified: { type: 'boolean' },
            two_factor_enabled: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            session_id: { type: 'string' },
            name: { type: 'string' },
            phone_number: { type: 'string' },
            status: { type: 'string', enum: ['initializing', 'qr_ready', 'connecting', 'connected', 'disconnected'] },
            qr_code: { type: 'string', nullable: true },
            pairing_code: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            message_id: { type: 'string' },
            session_id: { type: 'string' },
            recipient: { type: 'string' },
            message_type: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'sticker'] },
            content: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'sent', 'delivered', 'read', 'failed'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Template: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            content: { type: 'string' },
            variables: { type: 'array', items: { type: 'string' } },
            category: { type: 'string' },
            is_active: { type: 'boolean' }
          }
        },
        Group: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group JID' },
            subject: { type: 'string', description: 'Group name' },
            desc: { type: 'string', description: 'Group description' },
            owner: { type: 'string', description: 'Group owner JID' },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  admin: { type: 'string', nullable: true }
                }
              }
            },
            creation: { type: 'integer', description: 'Unix timestamp' }
          }
        },
        Contact: {
          type: 'object',
          properties: {
            jid: { type: 'string' },
            name: { type: 'string' },
            notify: { type: 'string' },
            status: { type: 'string' },
            imgUrl: { type: 'string', nullable: true }
          }
        },
        Webhook: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            session_id: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            is_active: { type: 'boolean' },
            secret: { type: 'string' }
          }
        },
        ScheduledMessage: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            session_id: { type: 'string' },
            recipient: { type: 'string' },
            message_type: { type: 'string' },
            content: { type: 'string' },
            scheduled_at: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['pending', 'sent', 'failed', 'cancelled'] }
          }
        },
        Plan: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            features: { type: 'object' },
            limits: { type: 'object' },
            is_active: { type: 'boolean' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Unauthorized - Invalid or expired token'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied - insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Forbidden - Admin access required'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Resource not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Validation failed',
                errors: [{ field: 'email', message: 'Invalid email format' }]
              }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/docs/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
