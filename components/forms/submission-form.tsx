/** @format */

"use client";

import type React from "react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, Loader2, Check } from "lucide-react";
import { createSubmission, uploadDocument } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface SubmissionFormProps {
  onSubmit?: (data: Submission) => void;
}

interface Submission {
  id: string;
  skill_code: string;
  skill_area: string;
  cluster: string;
  cohort: string;
  test_date: string;
  description: string;
  status?: string;
}

const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function SubmissionForm({ onSubmit }: SubmissionFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    skill_area: "",
    skill_code: "",
    cluster: "",
    cohort: "",
    test_date: getLocalDate(),
    description: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const clusterOptions = useMemo(
    () => Array.from({ length: 20 }, (_, i) => i + 1),
    []
  );

  const clearFieldError = (name: string) => {
    if (!errors[name]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const startFakeProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 30;
      });
    }, 200);
  };

  const validateAndSetFile = (selectedFile: File) => {
    // size
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        file: "File size must be less than 10MB",
      }));
      return;
    }

    // type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(selectedFile.type)) {
      setErrors((prev) => ({
        ...prev,
        file: "Only PDF and DOCX files are allowed",
      }));
      return;
    }

    setFile(selectedFile);
    clearFieldError("file");
    startFakeProgress();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    validateAndSetFile(selectedFile);
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // allow drop
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);

    const dropped = e.dataTransfer?.files?.[0];
    if (!dropped) return;

    validateAndSetFile(dropped);

    // clear the native input so selecting the same file again triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.skill_area.trim()) newErrors.skill_area = "Required";
    if (!formData.skill_code.trim()) newErrors.skill_code = "Required";
    if (!formData.cluster.trim()) newErrors.cluster = "Required";
    if (!formData.cohort.trim()) newErrors.cohort = "Required";
    if (!formData.test_date.trim()) newErrors.test_date = "Required";
    if (!formData.description.trim()) newErrors.description = "Required";
    if (!file) newErrors.file = "File upload required";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const submission = (await createSubmission({
        skill_area: formData.skill_area,
        skill_code: formData.skill_code,
        cluster: formData.cluster,
        cohort: formData.cohort,
        test_date: formData.test_date,
        description: formData.description,
      })) as Submission;

      if (file) {
        await uploadDocument(submission.id, file);
      }

      await fetch(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      });

      if (onSubmit) onSubmit(submission);
      else router.push("/dashboard");
    } catch (error) {
      console.error("Submission failed:", error);
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to submit",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Visual state for drop zone (keeps your existing look, adds drag highlight)
  const dropZoneClass = errors.file
    ? "border-red-400 bg-red-50"
    : file
    ? "border-green-400 bg-green-50"
    : isDragging
    ? "border-cyan-500 bg-cyan-50"
    : "border-slate-300 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side - Test Details */}
        <Card className="border-0 shadow-sm bg-white lg:col-span-1">
          <CardContent className="pt-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              Submission Details
            </h3>

            {/* Skill Area (Input) */}
            <div className="space-y-2">
              <Label
                htmlFor="skill_area"
                className="text-slate-700 font-semibold">
                Programme Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="skill_code"
                name="skill_code"
                placeholder="Enter Programme Code"
                value={formData.skill_code}
                onChange={handleChange}
                className={`border-slate-300 placeholder:text-slate-400 ${
                  errors.skill_code ? "border-red-500" : ""
                }`}
              />
              {errors.skill_code && (
                <p className="text-sm text-red-600">{errors.skill_code}</p>
              )}
            </div>

            {/* Programme Skill Area */}
            <div className="space-y-2">
              <Label
                htmlFor="skill_area"
                className="text-slate-700 font-semibold">
                Programme <span className="text-red-500">*</span>
              </Label>
              <Input
                id="skill_area"
                name="skill_area"
                placeholder="Enter Programme"
                value={formData.skill_area}
                onChange={handleChange}
                className={`border-slate-300 placeholder:text-slate-400 ${
                  errors.skill_area ? "border-red-500" : ""
                }`}
              />
              {errors.skill_area && (
                <p className="text-sm text-red-600">{errors.skill_area}</p>
              )}
            </div>

            {/* Cluster & Cohort */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="cluster"
                  className="text-slate-700 font-semibold">
                  Cluster <span className="text-red-500">*</span>
                </Label>
                <select
                  id="cluster"
                  name="cluster"
                  value={formData.cluster}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-slate-900 bg-white ${
                    errors.cluster ? "border-red-500" : ""
                  }`}>
                  <option value="">Select a cluster</option>
                  {clusterOptions.map((num) => (
                    <option key={num} value={num}>
                      Cluster {num}
                    </option>
                  ))}
                </select>
                {errors.cluster && (
                  <p className="text-sm text-red-600">{errors.cluster}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cohort"
                  className="text-slate-700 font-semibold">
                  Cohort <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cohort"
                  name="cohort"
                  placeholder="e.g. Fall 2024"
                  value={formData.cohort}
                  onChange={handleChange}
                  className={`border-slate-300 placeholder:text-slate-400 ${
                    errors.cohort ? "border-red-500" : ""
                  }`}
                />
                {errors.cohort && (
                  <p className="text-sm text-red-600">{errors.cohort}</p>
                )}
              </div>
            </div>

            {/* Test Date */}
            <div className="space-y-2">
              <Label
                htmlFor="test_date"
                className="text-slate-700 font-semibold">
                Test Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="test_date"
                name="test_date"
                type="date"
                value={formData.test_date}
                onChange={handleChange}
                className={`border-slate-300 ${
                  errors.test_date ? "border-red-500" : ""
                }`}
              />
              {errors.test_date && (
                <p className="text-sm text-red-600">{errors.test_date}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-slate-700 font-semibold">
                Short Description{" "}
                <span className="text-slate-500 font-normal">(Unit Code)</span>
                <span className="text-red-500">*</span>
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

        {/* Right side - File Upload (with Drag & Drop) */}
        <Card className="border-0 shadow-sm bg-white lg:col-span-1">
          <CardContent className="pt-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              Test Document
            </h3>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-slate-700 font-semibold">
                Upload File
              </Label>

              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer outline-none ${dropZoneClass}`}
              >
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="absolute opacity-0 w-0 h-0"
                />

                {file ? (
                  <>
                    <Check className="w-10 h-10 mx-auto mb-2 text-green-500" />
                    <p className="font-semibold text-slate-900">{file.name}</p>
                    <p className="text-sm text-green-600 mt-1">
                      Ready to upload
                    </p>
                  </>
                ) : (
                  <>
                    <FileUp className="w-10 h-10 mx-auto mb-2 text-cyan-500" />
                    <p className="font-semibold text-slate-900">
                      {isDragging
                        ? "Drop your file to attach"
                        : "Drag & drop your file here"}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      or{" "}
                      <span className="text-cyan-600 hover:text-cyan-700 font-medium">
                        click to browse
                      </span>
                    </p>
                  </>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Accepted formats: .pdf, .docx. Max size: 10MB
              </p>

              {errors.file && (
                <p className="text-sm text-red-600">{errors.file}</p>
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Preparing upload...</span>
                  <span className="text-slate-900 font-medium">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {file && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                <p className="text-sm text-cyan-900">
                  <span className="font-semibold">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {errors.submit && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errors.submit}
        </div>
      )}

      <div className="flex gap-3 justify-center lg:justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold h-11 px-8">
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
  );
}
