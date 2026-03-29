"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMessage } from "@/app/actions";

export function MessageForm() {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const isDisabled = content.trim() === "" || isPending;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createMessage(content.trim());
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Üzenet elmentve!");
        setContent("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Írd ide az üzeneted..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isPending}
        aria-label="Üzenet szövege"
      />
      <Button type="submit" disabled={isDisabled}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Mentés...
          </>
        ) : (
          "Mentés"
        )}
      </Button>
    </form>
  );
}
