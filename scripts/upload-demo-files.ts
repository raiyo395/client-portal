import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

for (const [key, value] of Object.entries(loadEnv('development', process.cwd(), ''))) {
  if (process.env[key] === undefined) process.env[key] = value
}

const supabaseUrl = requiredEnv('DEMO_SUPABASE_URL')
const serviceRoleKey = requiredEnv('DEMO_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const demoFiles = [
  {
    projectName: 'Demo: Brand refresh',
    fileName: 'demo-brand-brief.txt',
    content: 'Project brief: Refresh the brand identity and core digital assets.',
  },
  {
    projectName: 'Demo: Launch campaign',
    fileName: 'demo-launch-checklist.txt',
    content: 'Launch checklist: Final copy, accessible assets, and release sign-off.',
  },
]

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable ${name}.`)
  return value
}

async function main(): Promise<void> {
  const projectNames = [...new Set(demoFiles.map((file) => file.projectName))]
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .in('name', projectNames)
  if (projectsError) throw new Error(`Could not find demo projects for sample files: ${projectsError.message}`)

  const projectIds = new Map(projects.map((project) => [project.name, project.id]))
  for (const demoFile of demoFiles) {
    const projectId = projectIds.get(demoFile.projectName)
    if (!projectId) throw new Error(`Missing seeded project: ${demoFile.projectName}`)
    const storagePath = `${projectId}/${demoFile.fileName}`
    const { error } = await supabase.storage.from('project-files').upload(
      storagePath,
      Buffer.from(demoFile.content, 'utf8'),
      { contentType: 'text/plain', upsert: true },
    )
    if (error) throw new Error(`Could not upload ${demoFile.fileName}: ${error.message}`)
  }

  console.info(`Uploaded ${demoFiles.length} sample demo files.`)
}

main().catch((error: unknown) => {
  console.error('Demo file setup failed:', error)
  process.exitCode = 1
})
