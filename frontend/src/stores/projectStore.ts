import { create } from 'zustand'
import type { Project, Status, Label, ProjectMember, Board } from '@/types'

interface ProjectState {
  currentProject: Project | null
  boards: Board[]
  currentBoard: Board | null
  statuses: Status[]
  labels: Label[]
  members: ProjectMember[]

  setCurrentProject: (project: Project) => void
  setBoards: (boards: Board[]) => void
  setCurrentBoard: (board: Board | null) => void
  setStatuses: (statuses: Status[]) => void
  setLabels: (labels: Label[]) => void
  setMembers: (members: ProjectMember[]) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  boards: [],
  currentBoard: null,
  statuses: [],
  labels: [],
  members: [],

  setCurrentProject: (project) => set({ currentProject: project }),
  setBoards: (boards) =>
    set({ boards: boards.sort((a, b) => a.position - b.position) }),
  setCurrentBoard: (board) => set({ currentBoard: board }),
  setStatuses: (statuses) =>
    set({ statuses: statuses.sort((a, b) => a.position - b.position) }),
  setLabels: (labels) => set({ labels }),
  setMembers: (members) => set({ members }),
  clearProject: () =>
    set({ currentProject: null, boards: [], currentBoard: null, statuses: [], labels: [], members: [] }),
}))
