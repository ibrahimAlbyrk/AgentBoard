import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  colors?: string[]
  className?: string
}

const DEFAULT_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#22C55E', '#EF4444', '#06B6D4', '#6366F1',
]

export function ColorPicker({ value, onChange, colors = DEFAULT_COLORS, className }: ColorPickerProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="size-7 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            outline: value === color ? '2px solid var(--foreground)' : 'none',
            outlineOffset: '2px',
          }}
        />
      ))}
    </div>
  )
}
