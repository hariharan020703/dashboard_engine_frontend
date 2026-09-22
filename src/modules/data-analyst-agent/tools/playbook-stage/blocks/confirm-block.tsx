import * as React from "react"

import { Button } from "@/modules/data-analyst-agent/ui/button"

export function ConfirmBlockView({
  interactive,
  onAnswer,
}: {
  interactive: boolean
  onAnswer: (text: string) => void
}) {
  const [answered, setAnswered] = React.useState(false)

  return (
    <Button
      type="button"
      size="sm"
      disabled={!interactive || answered}
      className="cursor-pointer self-start"
      onClick={() => {
        setAnswered(true)
        onAnswer("Continue.")
      }}
    >
      Continue
    </Button>
  )
}
