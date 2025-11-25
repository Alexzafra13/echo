import path from 'node:path'
import fs from 'node:fs'
import { defineConfig } from 'prisma/config'

// Cargar .env manualmente (Prisma 7 ya no lo hace automáticamente)
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        if (key && !process.env[key]) {
          process.env[key] = value
        }
      }
    }
  }
}

loadEnvFile()

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),

  migrate: {
    async resolve({ datasourceUrl }) {
      return {
        url: datasourceUrl ?? process.env.DATABASE_URL,
      }
    },
  },

  studio: {
    async resolve({ datasourceUrl }) {
      return {
        url: datasourceUrl ?? process.env.DATABASE_URL,
      }
    },
  },

  seed: {
    command: 'tsx prisma/seed.ts',
  },
})
