import { supabase } from './supabase'
import type { Approval, Milestone, Project } from '../types'

export type ClientProjectRow = Project & { approved: number; milestone_total: number }
export type ClientMilestone = Milestone & { approvals: Approval[] }
export type ClientProjectDetails = { project: Project; milestones: ClientMilestone[] }

export async function fetchClientProjects(clientId: string): Promise<ClientProjectRow[]> {
  const { data, error } = await supabase.from('projects')
    .select('id, client_id, name, description, status, created_at')
    .eq('client_id', clientId).order('created_at', { ascending: false })
  if (error) throw error
  const projects = (data ?? []) as Project[]
  if (projects.length === 0) return []
  const { data: milestoneData, error: milestoneError } = await supabase.from('milestones')
    .select('id, project_id, status').in('project_id', projects.map((project) => project.id))
  if (milestoneError) throw milestoneError
  const milestones = (milestoneData ?? []) as Pick<Milestone, 'id' | 'project_id' | 'status'>[]
  const progress = new Map<string, { approved: number; total: number }>()
  for (const milestone of milestones) {
    const item = progress.get(milestone.project_id) ?? { approved: 0, total: 0 }
    item.total += 1
    if (milestone.status === 'approved') item.approved += 1
    progress.set(milestone.project_id, item)
  }
  return projects.map((project) => {
    const item = progress.get(project.id) ?? { approved: 0, total: 0 }
    return { ...project, approved: item.approved, milestone_total: item.total }
  })
}

export async function fetchClientProjectDetails(projectId: string): Promise<ClientProjectDetails | null> {
  const { data: projectData, error: projectError } = await supabase.from('projects')
    .select('id, client_id, name, description, status, created_at').eq('id', projectId).maybeSingle()
  if (projectError) throw projectError
  if (!projectData) return null
  const { data: milestoneData, error: milestoneError } = await supabase.from('milestones')
    .select('id, project_id, title, description, due_date, sort_order, status, created_at')
    .eq('project_id', projectId).order('sort_order', { ascending: true })
  if (milestoneError) throw milestoneError
  const milestones = (milestoneData ?? []) as Milestone[]
  if (milestones.length === 0) return { project: projectData as Project, milestones: [] }
  const { data: approvalData, error: approvalError } = await supabase.from('approvals')
    .select('id, milestone_id, author_id, decision, comment, created_at')
    .in('milestone_id', milestones.map((milestone) => milestone.id)).order('created_at', { ascending: false })
  if (approvalError) throw approvalError
  const grouped = new Map<string, Approval[]>()
  for (const approval of (approvalData ?? []) as Approval[]) {
    const entries = grouped.get(approval.milestone_id) ?? []
    entries.push(approval)
    grouped.set(approval.milestone_id, entries)
  }
  return {
    project: projectData as Project,
    milestones: milestones.map((milestone) => ({ ...milestone, approvals: grouped.get(milestone.id) ?? [] })),
  }
}
