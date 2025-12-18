import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
    const { submission_id } = await request.json()
    console.log("Resetting reviews for submission:", submission_id)
  await supabase.from("reviews").delete().eq("submission_id", submission_id)
  return NextResponse.json({ success: true })
}