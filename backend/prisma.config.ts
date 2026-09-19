import 'dotenv/config'
import { defineConfig } from 'prisma/config'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured for Prisma commands.')
}

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
})
