"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteMessage } from "@/app/actions";
import { formatRelativeTime } from "@/lib/utils";

interface MessageCardProps {
  id: string;
  content: string;
  createdAt: string;
}

export function MessageCard({ id, content, createdAt }: MessageCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMessage(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Üzenet törölve.");
      }
    });
  }

  return (
    <Card className={`transition-colors duration-150 hover:bg-muted/40 hover:ring-foreground/25 ${isPending ? "opacity-50" : ""}`}>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap break-words">{content}</p>
          <time className="mt-1 block text-xs text-muted-foreground">
            {formatRelativeTime(createdAt)}
          </time>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Üzenet törlése"
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
