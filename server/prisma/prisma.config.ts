import { defineConfig } from 'prisma/config'

export default defineConfig({
  seed: {
    command: 'tsx prisma/seed.ts',
  },
})
