import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("submission_documents")
      .select("*")
      .eq("submission_id", params.id)
      .order("version", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch documents" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from("submission_documents")
      .select("version")
      .eq("submission_id", params.id)
      .order("version", { ascending: false })
      .limit(1)

    const version = (existing && existing.length > 0 ? existing[0].version : 0) + 1
    const fileName = `${params.id}/v${version}/${file.name}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage.from("submissions").upload(fileName, file, {
      upsert: true,
    })

    if (uploadError) throw uploadError

    // Record document metadata
    const { data, error } = await supabase
      .from("submission_documents")
      .insert({
        submission_id: params.id,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        file_type: file.type,
        version,
        uploaded_by: user.id,
      })
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload document" },
      { status: 500 },
    )
  }
}
