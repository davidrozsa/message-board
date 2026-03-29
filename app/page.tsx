import { supabase } from "@/lib/supabase";
import { MessageForm } from "@/components/message-form";
import { MessageList } from "@/components/message-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Üzenőfal</h1>
      <div className="mb-8">
        <MessageForm />
      </div>
      <MessageList messages={messages ?? []} />
    </main>
  );
}
