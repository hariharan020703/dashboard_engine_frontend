import * as React from "react"
import { FileUp, Loader2, UploadCloud } from "lucide-react"

import { Button } from "@/modules/data-analyst-agent/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/data-analyst-agent/ui/dialog"
import { useAppDispatch } from "@/modules/data-analyst-agent/state/hooks"
import { uploadSessionFile, type UploadFileResponse } from "@/modules/data-analyst-agent/state/slices/filesSlice"

export type FileUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string | undefined
  userId: string
  accept?: string
  title?: string
  description?: string
  onUploaded?: (result: UploadFileResponse) => void
}

const DEFAULT_ACCEPT = ".txt,.md,.csv,.json,.pdf,.docx"

export function FileUploadDialog({
  open,
  onOpenChange,
  sessionId,
  userId,
  accept = DEFAULT_ACCEPT,
  title = "Attach a file",
  description = "Upload a file to add its content as context for your next message.",
  onUploaded,
}: FileUploadDialogProps) {
  const dispatch = useAppDispatch()
  const [file, setFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setFile(null)
      setError(null)
      setIsUploading(false)
    }
  }

  const handleUpload = async () => {
    if (!file || !sessionId || isUploading) return
    setIsUploading(true)
    setError(null)
    try {
      const result = await dispatch(
        uploadSessionFile({ sessionId, userId, file })
      ).unwrap()
      onUploaded?.(result)
      onOpenChange(false)
    } catch {
      setError("Couldn't upload that file. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors hover:bg-muted/50"
        >
          <UploadCloud className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {file ? file.name : "Click to choose a file"}
          </span>
          <span className="text-xs text-muted-foreground">
            .txt, .md, .csv, .json, .pdf, .docx — up to 10MB
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            setError(null)
            setFile(event.target.files?.[0] ?? null)
          }}
        />

        {error && <p className="text-xs text-destructive">{error}</p>}
        {!sessionId && (
          <p className="text-xs text-muted-foreground">
            Send a message first to start a session, then attach a file.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || !sessionId || isUploading}
            className="cursor-pointer gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <FileUp className="size-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

