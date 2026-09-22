import { toast } from 'sonner'
import { errorMessage } from '@/api/http'

/**
 * The application's only way to tell somebody what happened.
 *
 * There used to be two - a hand-rolled context provider for the dashboard
 * screens and sonner for the analyst workbench - which meant two stacking
 * corners, two sets of timings and two houses of style depending on which part
 * of the product you were in. This is the one, and it is a plain module rather
 * than a context: a toast has no state a component needs to subscribe to, and a
 * module import cannot be forgotten by a provider that was not mounted.
 *
 * The four tones carry meaning, not decoration:
 *
 *   success   it is done, and the server confirmed it
 *   error     it did not happen; stays until dismissed
 *   warning   it happened, but something needs attention
 *   info      it is in progress, or worth knowing
 *
 * An error is not auto-dismissed. Everything else is: an unread success is a
 * message nobody needed, but an unread failure is a change somebody believes
 * they made.
 */

export const notify = {
  success(message: string, description?: string) {
    return toast.success(message, { description })
  },

  /**
   * A failure. `description` is usually the API's own message, which is written
   * for the person reading it.
   */
  error(message: string, description?: string) {
    return toast.error(message, { description, duration: Infinity })
  },

  warning(message: string, description?: string) {
    return toast.warning(message, { description, duration: 8000 })
  },

  info(message: string, description?: string) {
    return toast.info(message, { description })
  },

  /**
   * A failure described by a caught error.
   *
   * `action` says what was being attempted, in the caller's words ("create the
   * user"), and the API's message becomes the detail. Two pieces of information
   * rather than one: what failed, and why the server says it failed.
   */
  failure(action: string, error: unknown) {
    return toast.error(`Unable to ${action}.`, {
      description: errorMessage(error, 'The server did not explain what went wrong.'),
      duration: Infinity,
    })
  },

  /**
   * A toast that stays until it is dismissed by id.
   *
   * For work whose outcome the caller reports itself - the connector dialog
   * shows "Checking the token…", then replaces it with the warehouse's actual
   * answer, which it only has once the call returns.
   */
  pending(message: string): string | number {
    return toast.loading(message, { duration: Infinity })
  },

  /**
   * A toast that stays while work is in flight and then resolves in place.
   *
   * Used for the operations that take long enough to doubt - onboarding sends
   * an email, so it waits on a mail server - where a button spinner alone
   * leaves somebody wondering whether their click registered.
   */
  promise<T>(
    work: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error: string }
  ) {
    return toast.promise(work, {
      loading: messages.loading,
      success: messages.success,
      error: (err: unknown) => ({
        message: messages.error,
        description: errorMessage(err, 'The server did not explain what went wrong.'),
      }),
    })
  },

  dismiss(id?: string | number) {
    toast.dismiss(id)
  },
}
