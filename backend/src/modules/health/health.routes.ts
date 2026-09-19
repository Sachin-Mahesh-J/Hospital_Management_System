import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { getHealth } from './health.controller.js'

export const healthRouter = Router()

healthRouter.get('/', validate({ query: z.object({}).strict() }), getHealth)
