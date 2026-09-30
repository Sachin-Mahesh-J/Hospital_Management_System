import { cpSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

cpSync(
  join(backendRoot, 'src', 'modules', 'audit', 'fonts'),
  join(backendRoot, 'dist', 'modules', 'audit', 'fonts'),
  { recursive: true },
)
