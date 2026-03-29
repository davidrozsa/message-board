import { MessageSquare } from "lucide-react";
import { MessageCard } from "@/components/message-card";

interface Message {
  id: string;
  content: string;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <MessageSquare className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">Még nincsenek üzenetek.</p>
        <p className="text-sm">Légy te az első, aki ír valamit!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => (
        <MessageCard
          key={message.id}
          id={message.id}
          content={message.content}
          createdAt={message.created_at}
        />
      ))}
    </div>
  );
}
