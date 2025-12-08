"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { FileUp, Loader2, Check } from "lucide-react"
import { createSubmission, uploadDocument } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"

interface SubmissionFormProps {
  onSubmit?: (data: any) => void
}

export default function SubmissionForm({ onSubmit }: SubmissionFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [formData, setFormData] = useState({
    title: "",
    skill_area: "",
    cohort: "",
    test_date: "",
    description: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, file: "File size must be less than 10MB" }))
        return
      }
      const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
      if (!validTypes.includes(selectedFile.type)) {
        setErrors((prev) => ({ ...prev, file: "Only PDF and DOCX files are allowed" }))
        return
      }
      setFile(selectedFile)
      if (errors.file) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.file
          return newErrors
        })
      }
      setUploadProgress(0)
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + Math.random() * 30
        })
      }, 200)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Required"
    if (!formData.skill_area.trim()) newErrors.skill_area = "Required"
    if (!formData.cohort.trim()) newErrors.cohort = "Required"
    if (!formData.test_date.trim()) newErrors.test_date = "Required"
    if (!file) newErrors.file = "File upload required"
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      const submission = await createSubmission({
        title: formData.title,
        skill_area: formData.skill_area,
        cohort: formData.cohort,
        test_date: formData.test_date,
        description: formData.description,
      })

      if (file && submission?.id) {
        await uploadDocument(submission.id, file)
      }

      await fetch(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      })

      if (onSubmit) {
        onSubmit(submission)
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Submission failed:", error)
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to submit",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side - Test Details */}
        <Card className="border-0 shadow-sm bg-white lg:col-span-1">
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-6">Test Details</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-700 font-semibold">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Mid-term Exam"
                value={formData.title}
                onChange={handleChange}
                className={`border-slate-300 placeholder:text-slate-400 ${errors.title ? "border-red-500" : ""}`}
              />
              {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skill_area" className="text-slate-700 font-semibold">
                  Skill Area <span className="text-red-500">*</span>
                </Label>
                <select
                  id="skill_area"
                  name="skill_area"
                  value={formData.skill_area}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-slate-900 bg-white ${
                    errors.skill_area ? "border-red-500" : ""
                  }`}
                >
                  <option value="">Select a skill area</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Science">Science</option>
                  <option value="History">History</option>
                  <option value="Advanced Diagnostics">Advanced Diagnostics</option>
                </select>
                {errors.skill_area && <p className="text-sm text-red-600">{errors.skill_area}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cohort" className="text-slate-700 font-semibold">
                  Cohort <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cohort"
                  name="cohort"
                  placeholder="e.g. Fall 2024"
                  value={formData.cohort}
                  onChange={handleChange}
                  className={`border-slate-300 placeholder:text-slate-400 ${errors.cohort ? "border-red-500" : ""}`}
                />
                {errors.cohort && <p className="text-sm text-red-600">{errors.cohort}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_date" className="text-slate-700 font-semibold">
                Test Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="test_date"
                name="test_date"
                type="date"
                value={formData.test_date}
                onChange={handleChange}
                className={`border-slate-300 ${errors.test_date ? "border-red-500" : ""}`}
              />
              {errors.test_date && <p className="text-sm text-red-600">{errors.test_date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-700 font-semibold">
                Short Description <span className="text-slate-500 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add a brief summary of the test document..."
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="border-slate-300 placeholder:text-slate-400 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right side - Test Document Upload */}
        <Card className="border-0 shadow-sm bg-white lg:col-span-1">
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-6">Test Document</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-slate-700 font-semibold">
                Upload File
              </Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                  errors.file
                    ? "border-red-400 bg-red-50"
                    : file
                      ? "border-green-400 bg-green-50"
                      : "border-slate-300 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50"
                }`}
              >
                <input
                  id="file"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="absolute opacity-0 w-0 h-0"
                />
                <label htmlFor="file" className="cursor-pointer block">
                  {file ? (
                    <>
                      <Check className="w-10 h-10 mx-auto mb-2 text-green-500" />
                      <p className="font-semibold text-slate-900">{file.name}</p>
                      <p className="text-sm text-green-600 mt-1">Ready to upload</p>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-10 h-10 mx-auto mb-2 text-cyan-500" />
                      <p className="font-semibold text-slate-900">Drag & drop your file here</p>
                      <p className="text-sm text-slate-600 mt-1">
                        or <span className="text-cyan-600 hover:text-cyan-700 font-medium">click to browse</span>
                      </p>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-slate-500">Accepted formats: .doc, .docx. Max size: 10MB</p>
              {errors.file && <p className="text-sm text-red-600">{errors.file}</p>}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Preparing upload...</span>
                  <span className="text-slate-900 font-medium">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {file && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                <p className="text-sm text-cyan-900">
                  <span className="font-semibold">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {errors.submit && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.submit}</div>
      )}

      <div className="flex gap-3 justify-center lg:justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold h-11 px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit for Review"
          )}
        </Button>
      </div>
    </form>
  )
}
