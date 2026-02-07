import { create } from 'zustand'
import type { Project, Status, Label, ProjectMember } from '@/types'

interface ProjectState {
  currentProject: Project | null
  statuses: Status[]
  labels: Label[]
  members: ProjectMember[]

  setCurrentProject: (project: Project) => void
  setStatuses: (statuses: Status[]) => void
  setLabels: (labels: Label[]) => void
  setMembers: (members: ProjectMember[]) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  statuses: [],
  labels: [],
  members: [],

  setCurrentProject: (project) => set({ currentProject: project }),
  setStatuses: (statuses) =>
    set({ statuses: statuses.sort((a, b) => a.position - b.position) }),
  setLabels: (labels) => set({ labels }),
  setMembers: (members) => set({ members }),
  clearProject: () =>
    set({ currentProject: null, statuses: [], labels: [], members: [] }),
}))
