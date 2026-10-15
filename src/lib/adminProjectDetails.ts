import { supabase } from './supabase'
import type { Approval, Milestone, Profile, Project } from '../types'

export type ApprovalWithAuthor = Approval & { author_name: string }
export type MilestoneWithApprovals = Milestone & { approvals: ApprovalWithAuthor[] }
export type AdminProjectDetails = { project: Project; milestones: MilestoneWithApprovals[] }

export async function fetchAdminProjectDetails(projectId: string): Promise<AdminProjectDetails | null> {
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
  const approvals = (approvalData ?? []) as Approval[]
  const authorIds = [...new Set(approvals.map((approval) => approval.author_id))]
  let profiles: Pick<Profile, 'id' | 'full_name'>[] = []
  if (authorIds.length > 0) {
    const { data, error } = await supabase.from('profiles').select('id, full_name').in('id', authorIds)
    if (error) throw error
    profiles = (data ?? []) as Pick<Profile, 'id' | 'full_name'>[]
  }
  const names = new Map(profiles.map((profile) => [profile.id, profile.full_name]))
  const grouped = new Map<string, ApprovalWithAuthor[]>()
  for (const approval of approvals) {
    const entries = grouped.get(approval.milestone_id) ?? []
    entries.push({ ...approval, author_name: names.get(approval.author_id) || 'Unknown user' })
    grouped.set(approval.milestone_id, entries)
  }
  return {
    project: projectData as Project,
    milestones: milestones.map((milestone) => ({ ...milestone, approvals: grouped.get(milestone.id) ?? [] })),
  }
}
