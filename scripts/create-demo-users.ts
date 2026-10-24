import { createClient, type User } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

for (const [key, value] of Object.entries(loadEnv('development', process.cwd(), ''))) {
  if (process.env[key] === undefined) process.env[key] = value
}

const supabaseUrl = requiredEnv('DEMO_SUPABASE_URL')
const serviceRoleKey = requiredEnv('DEMO_SERVICE_ROLE_KEY')
const adminEmail = requiredEnv('DEMO_ADMIN_EMAIL').toLowerCase()
const clientEmail = requiredEnv('DEMO_CLIENT_EMAIL').toLowerCase()
const demoPassword = requiredEnv('DEMO_PASSWORD')

if (adminEmail === clientEmail) {
  throw new Error('DEMO_ADMIN_EMAIL and DEMO_CLIENT_EMAIL must be different accounts.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const seedProjectNames = ['Demo: Brand refresh', 'Demo: Website redesign', 'Demo: Launch campaign']

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable ${name}.`)
  return value
}

async function findUserByEmail(email: string): Promise<User | null> {
  const perPage = 1000
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Could not list Supabase users: ${error.message}`)

    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < perPage) return null
  }
}

async function ensureDemoUser(
  email: string,
  fullName: string,
  role: 'admin' | 'client',
): Promise<User> {
  const existingUser = await findUserByEmail(email)
  if (!existingUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { demo_role: role },
    })
    if (error) throw new Error(`Could not create demo ${role} user: ${error.message}`)
    return data.user
  }

  const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password: demoPassword,
    email_confirm: true,
    user_metadata: { ...existingUser.user_metadata, full_name: fullName },
    app_metadata: { ...existingUser.app_metadata, demo_role: role },
  })
  if (error) throw new Error(`Could not refresh demo ${role} user: ${error.message}`)
  return data.user
}

async function clearDemoStorageFiles(projectIds: string[]): Promise<number> {
  const bucket = supabase.storage.from('project-files')
  const storagePaths: string[] = []

  for (const projectId of projectIds) {
    const pageSize = 100
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await bucket.list(projectId, { limit: pageSize, offset })
      if (error) throw new Error(`Could not list demo files for project ${projectId}: ${error.message}`)
      storagePaths.push(...data.filter((file) => file.id !== null).map((file) => `${projectId}/${file.name}`))
      if (data.length < pageSize) break
    }
  }

  for (let index = 0; index < storagePaths.length; index += 100) {
    const { error } = await bucket.remove(storagePaths.slice(index, index + 100))
    if (error) throw new Error(`Could not remove old demo files: ${error.message}`)
  }

  return storagePaths.length
}

async function main(): Promise<void> {
  const adminUser = await ensureDemoUser(adminEmail, 'Demo Administrator', 'admin')
  const clientUser = await ensureDemoUser(clientEmail, 'Demo Client', 'client')

  const { error: profileError } = await supabase.from('profiles').upsert([
    { id: adminUser.id, full_name: 'Demo Administrator', role: 'admin' },
    { id: clientUser.id, full_name: 'Demo Client', role: 'client' },
  ], { onConflict: 'id' })
  if (profileError) throw new Error(`Could not upsert demo profiles: ${profileError.message}`)

  const { data: existingDemoProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .like('name', 'Demo:%')
  if (projectsError) throw new Error(`Could not find seeded demo projects: ${projectsError.message}`)

  const deletedFiles = await clearDemoStorageFiles(existingDemoProjects.map((project) => project.id))
  const seedProjects = existingDemoProjects.filter((project) => seedProjectNames.includes(project.name))
  if (seedProjects.length > 0) {
    const { error: assignmentError } = await supabase
      .from('projects')
      .update({ client_id: clientUser.id })
      .in('id', seedProjects.map((project) => project.id))
    if (assignmentError) throw new Error(`Could not assign demo projects to the demo client: ${assignmentError.message}`)
  }

  console.info(`Demo users are ready. Re-set passwords and profile roles for ${adminEmail} and ${clientEmail}.`)
  console.info(`Assigned ${seedProjects.length} demo project(s) to the demo client.`)
  console.info(`Removed ${deletedFiles} old demo storage object(s).`)
}

main().catch((error: unknown) => {
  console.error('Demo user setup failed:', error)
  process.exitCode = 1
})
