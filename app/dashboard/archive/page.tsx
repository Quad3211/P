"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Archive, Search, Filter, Calendar } from "lucide-react"

interface ArchivedSubmission {
  id: string
  submission_id: string
  title: string
  skill_area: string
  cohort: string
  instructor_name: string
  archived_at: string
  retention_until: string
  file_format: string
  archive_notes: string
}

export default function ArchivePage() {
  const [archives, setArchives] = useState<ArchivedSubmission[]>([])
  const [filteredArchives, setFilteredArchives] = useState<ArchivedSubmission[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSkillArea, setFilterSkillArea] = useState("")
  const [filterCohort, setFilterCohort] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        const response = await fetch("/api/archive")
        if (response.ok) {
          const data = await response.json()
          setArchives(data)
          setFilteredArchives(data)
        }
      } catch (error) {
        console.error("Failed to fetch archives:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchArchives()
  }, [])

  useEffect(() => {
    let filtered = archives

    if (searchQuery) {
      filtered = filtered.filter(
        (archive) =>
          archive.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          archive.submission_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          archive.instructor_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterSkillArea) {
      filtered = filtered.filter((archive) => archive.skill_area === filterSkillArea)
    }

    if (filterCohort) {
      filtered = filtered.filter((archive) => archive.cohort === filterCohort)
    }

    setFilteredArchives(filtered)
  }, [searchQuery, filterSkillArea, filterCohort, archives])

  const handleDownload = (submissionId: string) => {
    console.log("Downloading:", submissionId)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterSkillArea("")
    setFilterCohort("")
  }

  const skillAreas = [...new Set(archives.map((a) => a.skill_area))]
  const cohorts = [...new Set(archives.map((a) => a.cohort))]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Archive className="w-8 h-8 text-cyan-600" />
          <h1 className="text-4xl font-bold text-slate-900">Document Archive</h1>
        </div>
        <p className="text-slate-600">
          Access and manage archived RFA submissions with secure long-term storage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900">{archives.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-cyan-600">
              {archives.filter((a) => new Date(a.archived_at).getFullYear() === 2024).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Storage Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900">PDF & Original</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Retention Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900">5 Years</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <CardTitle>Search & Filter</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Search by title, ID, or instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="skill-area">Skill Area</Label>
              <select
                id="skill-area"
                value={filterSkillArea}
                onChange={(e) => setFilterSkillArea(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">All Skill Areas</option>
                {skillAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="cohort">Cohort</Label>
              <select
                id="cohort"
                value={filterCohort}
                onChange={(e) => setFilterCohort(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">All Cohorts</option>
                {cohorts.map((cohort) => (
                  <option key={cohort} value={cohort}>
                    {cohort}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(searchQuery || filterSkillArea || filterCohort) && (
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
              <span className="text-sm text-slate-600">
                Showing {filteredArchives.length} of {archives.length} archived documents
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archived Documents</CardTitle>
          <CardDescription>Browse and download archived RFA submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              <p className="mt-4 text-slate-600">Loading archives...</p>
            </div>
          ) : filteredArchives.length === 0 ? (
            <div className="py-12 text-center">
              <Archive className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No archived documents found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArchives.map((archive) => (
                <div
                  key={archive.id}
                  className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-semibold text-cyan-600">
                        {archive.submission_id}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                        {archive.file_format}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{archive.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                      <span>{archive.skill_area}</span>
                      <span>•</span>
                      <span>{archive.cohort}</span>
                      <span>•</span>
                      <span>{archive.instructor_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Archive className="w-3 h-3" />
                        <span>Archived: {new Date(archive.archived_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Retained until: {new Date(archive.retention_until).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {archive.archive_notes && (
                      <p className="mt-2 text-sm text-slate-600 italic">{archive.archive_notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      onClick={() => handleDownload(archive.submission_id)}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Archive className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Archive Information</h4>
              <p className="text-sm text-blue-800">
                All archived documents are securely stored with a standard retention period of 5 years. Documents
                are available in their original format and as PDF. Access is logged for compliance and audit
                purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}