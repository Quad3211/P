import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("submission_documents")
    .select("*")
    .eq("submission_id", id)
    .order("version", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}


export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.formData()
    const submissionId = body.get("submissionId") as string
    const fileBlob = body.get("file") as Blob
    // Init

    if (!submissionId || !fileBlob) {
      return NextResponse.json({ error: "Missing submission ID or file" }, { status: 400 })
    }

    // Check submission exists
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("id, instructor_id")
      .eq("id", submissionId)
      .maybeSingle()

    if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    if (submission.instructor_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Upload file
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: existing } = await supabase
      .from("submission_documents")
      .select("version")
      .eq("submission_id", submissionId)
      .order("version", { ascending: false })
      .limit(1)

    const version = existing?.[0]?.version ? existing[0].version + 1 : 1
    const safeName = (fileBlob as any).name?.replace(/\s+/g, "_") || "file"
    const filePath = `${submissionId}/v${version}/${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(filePath, buffer, { upsert: true })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    // Insert metadata
    const { data: docData, error } = await supabase
      .from("submission_documents")
      .insert({
        submission_id: submissionId,
        file_name: safeName,
        file_path: filePath,
        file_size: fileBlob.size,
        file_type: fileBlob.type,
        version,
        uploaded_by: user.id,
      })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(docData[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to upload document" }, { status: 500 })
  }
}
