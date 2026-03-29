"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function createMessage(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Az üzenet nem lehet üres." };
  }

  const { error } = await supabase.from("messages").insert({ content: trimmed });

  if (error) {
    return { error: "Hiba történt. Kérlek próbáld újra." };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.from("messages").delete().eq("id", id);

  if (error) {
    return { error: "Hiba történt. Kérlek próbáld újra." };
  }

  revalidatePath("/");
  return { success: true };
}
