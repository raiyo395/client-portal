import { supabase } from './supabase'
import type { Milestone, Profile, Project } from '../types'

export type AdminProjectRow = Project & { client_name: string; approved: number; milestone_total: number }

export async function fetchAdminProjects(): Promise<AdminProjectRow[]> {
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('id, client_id, name, description, status, created_at')
    .order('created_at', { ascending: false })
  if (projectError) throw projectError

  const projects = (projectData ?? []) as Project[]
  if (projects.length === 0) return []

  const clientIds = [...new Set(projects.map((project) => project.client_id))]
  const projectIds = projects.map((project) => project.id)
  const [profilesResult, milestonesResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', clientIds),
    supabase.from('milestones').select('id, project_id, status').in('project_id', projectIds),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (milestonesResult.error) throw milestonesResult.error

  const profiles = (profilesResult.data ?? []) as Pick<Profile, 'id' | 'full_name'>[]
  const milestones = (milestonesResult.data ?? []) as Pick<Milestone, 'id' | 'project_id' | 'status'>[]
  const names = new Map(profiles.map((profile) => [profile.id, profile.full_name]))
  const progress = new Map<string, { approved: number; total: number }>()
  for (const milestone of milestones) {
    const current = progress.get(milestone.project_id) ?? { approved: 0, total: 0 }
    current.total += 1
    if (milestone.status === 'approved') current.approved += 1
    progress.set(milestone.project_id, current)
  }

  return projects.map((project) => {
    const projectProgress = progress.get(project.id) ?? { approved: 0, total: 0 }
    return {
      ...project,
      client_name: names.get(project.client_id) ?? 'Unknown client',
      approved: projectProgress.approved,
      milestone_total: projectProgress.total,
    }
  })
}

export async function fetchClientProfiles(): Promise<Pick<Profile, 'id' | 'full_name'>[]> {
  const { data, error } = await supabase.from('profiles').select('id, full_name').eq('role', 'client').order('full_name')
  if (error) throw error
  return (data ?? []) as Pick<Profile, 'id' | 'full_name'>[]
}
