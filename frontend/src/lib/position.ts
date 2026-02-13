/**
 * Position calculation utilities for task ordering.
 * Must stay in sync with backend PositionService (backend/app/services/position_service.py).
 */

export const POSITION_GAP = 1024.0

/**
 * Calculate the position for a task being inserted at `insertIdx` in an ordered task list.
 * Uses midpoint bisection — same algorithm as backend PositionService.calculate_position.
 */
export function calculateInsertPosition(
  sortedPositions: number[],
  insertIdx: number,
): number {
  // Empty list — first item
  if (sortedPositions.length === 0) {
    return POSITION_GAP
  }

  // Insert before first
  if (insertIdx <= 0) {
    return sortedPositions[0] / 2
  }

  // Insert after last
  if (insertIdx >= sortedPositions.length) {
    return sortedPositions[sortedPositions.length - 1] + POSITION_GAP
  }

  // Insert between two tasks
  const before = sortedPositions[insertIdx - 1]
  const after = sortedPositions[insertIdx]
  return (before + after) / 2
}
