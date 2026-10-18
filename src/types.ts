export type Profile = {
  id: string
  full_name: string | null
  role: 'admin' | 'client'
  created_at?: string
}

export type Project = {
  id: string
  client_id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed'
  created_at: string
}

export type Milestone = {
  id: string
  project_id: string
  title: string
  description: string | null
  due_date: string | null
  sort_order: number
  status: 'pending' | 'in_review' | 'approved' | 'changes_requested'
  created_at: string
}

export type Approval = {
  id: string
  milestone_id: string
  author_id: string
  decision: 'approved' | 'changes_requested'
  comment: string | null
  created_at: string
}

export type ProjectFile = {
  id: string
  project_id: string
  uploaded_by: string
  file_name: string
  storage_path: string
  size_bytes: number
  mime_type: string | null
  created_at: string
}
