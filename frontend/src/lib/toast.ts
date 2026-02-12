import { toast as sonnerToast, type ExternalToast } from 'sonner'
import { getErrorMessageWithNetwork, parseApiError } from './errors'

type ToastOpts = ExternalToast

/**
 * Pre-configured toast helpers with sensible defaults.
 * - success: 3s duration
 * - error: 5s duration, parses API error structure
 * - warning: 4s duration
 * - info: 3s duration
 */
export const toast = {
  success(message: string, opts?: ToastOpts) {
    return sonnerToast.success(message, { duration: 3000, ...opts })
  },

  /**
   * Show error toast. Accepts either a plain string or a caught error
   * (from API client). Automatically extracts the human-readable message.
   */
  error(messageOrError: string | unknown, opts?: ToastOpts) {
    const message =
      typeof messageOrError === 'string'
        ? messageOrError
        : getErrorMessageWithNetwork(messageOrError)

    // If the error has field-level details, show them as description
    let description: string | undefined
    if (typeof messageOrError !== 'string') {
      const parsed = parseApiError(messageOrError)
      if (parsed.details?.length) {
        description = parsed.details.map((d) => `${d.field}: ${d.message}`).join(', ')
      }
    }

    return sonnerToast.error(message, {
      duration: 5000,
      description: description || opts?.description,
      ...opts,
    })
  },

  warning(message: string, opts?: ToastOpts) {
    return sonnerToast.warning(message, { duration: 4000, ...opts })
  },

  info(message: string, opts?: ToastOpts) {
    return sonnerToast.info(message, { duration: 3000, ...opts })
  },

  /** Dismiss a toast by ID */
  dismiss(id?: string | number) {
    return sonnerToast.dismiss(id)
  },
}
