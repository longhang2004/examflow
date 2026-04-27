import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  PORT: Joi.number().default(3001),
  FRONTEND_URL: Joi.string().required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  AI_PROVIDER: Joi.string().valid('openai', 'gemini').optional(),
  OPENAI_API_KEY: Joi.string().optional().allow(''),
  OPENAI_MODEL: Joi.string().optional().allow(''),
  GEMINI_API_KEY: Joi.string().optional().allow(''),
  GEMINI_MODEL: Joi.string().optional().allow(''),
  GEMINI_BASE_URL: Joi.string().optional().allow(''),
  AI_MODEL: Joi.string().optional().allow(''),
  AI_RATE_LIMIT_PER_HOUR: Joi.number().integer().min(0).optional(),
  CLOUDINARY_URL: Joi.string().optional().allow(''),
  CLOUDINARY_FOLDER: Joi.string().optional().allow(''),
});
