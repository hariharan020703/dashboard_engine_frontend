/*
 * The workbench was ported with its own copy of `cn`. It now re-exports the
 * shared one so there is a single implementation: two `twMerge` configurations
 * in one bundle is how a class conflict starts resolving differently depending
 * on which file imported the helper.
 */
export { cn } from '@/lib/utils'
