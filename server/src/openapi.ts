// OpenAPI 3.1 spec — kept in sync manually with route files.
// Served at GET /api/openapi.json and rendered at GET /docs.

import { ROLES } from '../../shared/src/schemas.ts';

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'BiFi API',
    description: 'Vereins-Getränkeliste — club beverage tally with gamification.',
    version: '1.0.0',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local dev' }],

  // ─── Reusable components ──────────────────────────────────────────────────

  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'bifi_session',
        description: 'HttpOnly session cookie issued after login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error', 'code'],
        properties: {
          error: { type: 'string', example: 'Unauthorized' },
          code: { type: 'string', example: 'UNAUTHORIZED' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          displayName: { type: 'string' },
          username: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          role: { type: 'string', enum: [...ROLES] },
          balance: { type: 'integer', description: 'Balance in Cent; can be negative' },
          jackpotAllowed: { type: 'boolean' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Variant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: '0,5l' },
          price: { type: 'integer', description: 'Price in Cent' },
          isActive: { type: 'boolean' },
          sortOrder: { type: 'integer' },
        },
      },
      Buyable: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          basePrice: { type: 'integer', description: 'Price in Cent; used when no variants' },
          imageUrl: { type: 'string', nullable: true },
          category: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          isQuickBuy: { type: 'boolean' },
          sortOrder: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          variants: { type: 'array', items: { $ref: '#/components/schemas/Variant' } },
        },
      },
      TransactionItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          transactionId: { type: 'string', format: 'uuid' },
          buyableId: { type: 'string', format: 'uuid' },
          variantId: { type: 'string', format: 'uuid', nullable: true },
          quantity: { type: 'integer' },
          unitPrice: { type: 'integer', description: 'Price-at-purchase snapshot in Cent' },
          totalPrice: { type: 'integer' },
          buyableName: { type: 'string' },
          variantName: { type: 'string', nullable: true },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          initiatedBy: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['purchase', 'deposit', 'correction', 'jackpot', 'prost'] },
          totalAmount: {
            type: 'integer',
            description: 'Negative = debit, positive = credit (Cent)',
          },
          groupId: { type: 'string', format: 'uuid', nullable: true },
          note: { type: 'string', nullable: true },
          cancelledAt: { type: 'string', format: 'date-time', nullable: true },
          cancelledBy: { type: 'string', format: 'uuid', nullable: true },
          jackpotMultiplier: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          items: { type: 'array', items: { $ref: '#/components/schemas/TransactionItem' } },
        },
      },
      Paginated: {
        type: 'object',
        properties: {
          data: { type: 'array', items: {} },
          nextCursor: { type: 'string', nullable: true },
        },
      },
      Achievement: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          tier: { type: 'string', enum: ['bronze', 'silver', 'gold'], nullable: true },
          groupKey: { type: 'string', nullable: true },
          hidden: { type: 'boolean', nullable: true },
          threshold: { type: 'integer', nullable: true },
        },
      },
    },
  },

  // Default security for all routes (override per route where not required)
  security: [{ sessionCookie: [] }],

  // ─── Paths ────────────────────────────────────────────────────────────────

  paths: {
    // ── Auth / OIDC ──────────────────────────────────────────────────────────

    '/api/auth/login': {
      get: {
        tags: ['Auth'],
        summary: 'Redirect to OIDC provider',
        description: 'Stores PKCE verifier + state in session, then redirects to Authentik.',
        security: [],
        responses: {
          302: { description: 'Redirect to Authentik login page' },
          503: {
            description: 'OIDC not configured',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/api/auth/callback': {
      get: {
        tags: ['Auth'],
        summary: 'OIDC callback',
        description: 'Exchanges code for tokens, upserts user, sets session cookie.',
        security: [],
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          302: { description: 'Redirect to / on success or /login?error=… on failure' },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Clears session data. Session cookie is expired client-side.',
        responses: {
          200: {
            description: 'Logged out',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' } } },
              },
            },
          },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        responses: {
          200: {
            description: 'Authenticated user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          401: {
            description: 'Not authenticated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    // ── Auth / Local ─────────────────────────────────────────────────────────

    '/api/auth/local/bootstrap': {
      post: {
        tags: ['Auth'],
        summary: 'Bootstrap first admin',
        description: 'Creates the first admin user. Only works when the users table is empty.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'displayName', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string', minLength: 2 },
                  displayName: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Admin created' },
          403: { description: 'Users already exist' },
        },
      },
    },

    '/api/auth/local/login': {
      post: {
        tags: ['Auth'],
        summary: 'Local login',
        description: 'Authenticate with email or username + password.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['login', 'password'],
                properties: {
                  login: { type: 'string', description: 'Email or username' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Logged in — session cookie set' },
          401: { description: 'Invalid credentials' },
          403: { description: 'Account deactivated' },
        },
      },
    },

    '/api/auth/local/users': {
      post: {
        tags: ['Auth'],
        summary: 'Create local user',
        description: 'Admin only. Creates a user with local password login.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'displayName', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string', minLength: 2, maxLength: 32 },
                  displayName: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  role: {
                    type: 'string',
                    enum: ['admin', 'moderator', 'member'],
                    default: 'member',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          403: { description: 'Forbidden' },
        },
      },
    },

    '/api/auth/local/users/{id}/password': {
      put: {
        tags: ['Auth'],
        summary: 'Set user password',
        description: 'Admin only.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: { password: { type: 'string', minLength: 8 } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password updated' },
          404: { description: 'User not found' },
        },
      },
    },

    // ── Buyables ─────────────────────────────────────────────────────────────

    '/api/buyables': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        parameters: [
          {
            name: 'quickBuyOnly',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter to QuickBuy items only',
          },
        ],
        responses: {
          200: {
            description: 'Array of active products with variants',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Buyable' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product',
        description: 'Moderator or admin required.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'basePrice'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  basePrice: { type: 'integer', description: 'Cent' },
                  imageUrl: { type: 'string', format: 'uri' },
                  category: { type: 'string' },
                  isQuickBuy: { type: 'boolean', default: false },
                  sortOrder: { type: 'integer', default: 0 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Buyable' } } },
          },
        },
      },
    },

    '/api/buyables/{id}': {
      put: {
        tags: ['Products'],
        summary: 'Update product',
        description: 'Moderator or admin required.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  basePrice: { type: 'integer' },
                  imageUrl: { type: 'string', nullable: true },
                  category: { type: 'string', nullable: true },
                  isQuickBuy: { type: 'boolean' },
                  isActive: { type: 'boolean' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated product',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Buyable' } } },
          },
          404: { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Deactivate product',
        description: 'Admin only. Soft-deletes (sets isActive=false).',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Deactivated' },
          404: { description: 'Not found' },
        },
      },
    },

    '/api/buyables/{id}/variants': {
      post: {
        tags: ['Products'],
        summary: 'Add variant',
        description: 'Moderator or admin required.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'price'],
                properties: {
                  name: { type: 'string', example: '0,5l' },
                  price: { type: 'integer', description: 'Cent' },
                  sortOrder: { type: 'integer', default: 0 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Variant created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Variant' } } },
          },
        },
      },
    },

    '/api/buyables/{id}/variants/{variantId}': {
      put: {
        tags: ['Products'],
        summary: 'Update variant',
        description: 'Moderator or admin required.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'variantId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'integer' },
                  isActive: { type: 'boolean' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated variant' },
          404: { description: 'Not found' },
        },
      },
    },

    // ── Transactions ─────────────────────────────────────────────────────────

    '/api/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'Own transaction history',
        parameters: [
          {
            name: 'cursor',
            in: 'query',
            schema: { type: 'string' },
            description: 'Pagination cursor from previous response',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'Paginated transactions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
                    nextCursor: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/transactions/purchase': {
      post: {
        tags: ['Transactions'],
        summary: 'Buy products',
        description:
          'Deducts from balance. Active promotions are applied automatically. Rate-limited to 20/min.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['buyableId', 'quantity'],
                      properties: {
                        buyableId: { type: 'string', format: 'uuid' },
                        variantId: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Required when product has variants',
                        },
                        quantity: { type: 'integer', minimum: 1, maximum: 99 },
                      },
                    },
                  },
                  groupId: { type: 'string', format: 'uuid' },
                  note: { type: 'string', maxLength: 200 },
                },
              },
              example: {
                items: [{ buyableId: '<uuid>', quantity: 1 }],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Transaction created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Transaction' } },
            },
          },
          400: { description: 'Variant required / product not found' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },

    '/api/transactions/{id}': {
      delete: {
        tags: ['Transactions'],
        summary: 'Cancel transaction',
        description:
          'Self-cancel within 5 minutes; moderator/admin can cancel anytime. Jackpot transactions require mod+.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Cancelled and refunded' },
          403: { description: 'Window expired, wrong user, or jackpot restriction' },
          404: { description: 'Not found' },
          409: { description: 'Already cancelled' },
        },
      },
    },

    '/api/transactions/admin/all': {
      get: {
        tags: ['Transactions'],
        summary: 'All transactions (mod+)',
        parameters: [
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated transaction list' },
          403: { description: 'Forbidden' },
        },
      },
    },

    // ── Achievements ──────────────────────────────────────────────────────────

    '/api/achievements/meta': {
      get: {
        tags: ['Achievements'],
        summary: 'Get achievement metadata',
        description: 'Returns list of all available achievements and their UI properties.',
        responses: {
          200: {
            description: 'Achievement list',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Achievement' } },
              },
            },
          },
        },
      },
    },

    // ── Health ────────────────────────────────────────────────────────────────

    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: {
          200: {
            description: 'Server is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
