"use client"

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSubmissions, apiCall } from '@/lib/api'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration?: number
}

export default function LibTestPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)

  const runTests = async () => {
    setRunning(true)
    const testResults: TestResult[] = []

    // Test 1: Supabase Client
    const startSupabase = Date.now()
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client returned null')
      }
      testResults.push({ 
        name: 'Supabase Client Creation', 
        passed: true, 
        duration: Date.now() - startSupabase 
      })
    } catch (error) {
      testResults.push({ 
        name: 'Supabase Client Creation', 
        passed: false, 
        duration: Date.now() - startSupabase,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Get Submissions
    const startSubmissions = Date.now()
    try {
      const submissions = await getSubmissions()
      if (!Array.isArray(submissions)) {
        throw new Error('getSubmissions did not return an array')
      }
      testResults.push({ 
        name: 'Get Submissions API', 
        passed: true, 
        duration: Date.now() - startSubmissions 
      })
    } catch (error) {
      testResults.push({ 
        name: 'Get Submissions API', 
        passed: false, 
        duration: Date.now() - startSubmissions,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: API Error Handling
    const startError = Date.now()
    try {
      // Test with a non-existent endpoint
      await apiCall('/api/nonexistent-endpoint-test')
      testResults.push({ 
        name: 'Error Handling', 
        passed: false, 
        duration: Date.now() - startError,
        error: 'Should have thrown an error'
      })
    } catch (error) {
      // This is expected - error handling is working
      testResults.push({ 
        name: 'Error Handling', 
        passed: true, 
        duration: Date.now() - startError 
      })
    }

    setResults(testResults)
    setRunning(false)
  }

  const passedCount = results.filter(r => r.passed).length

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Library Test Suite</h1>
        
        <button
          onClick={runTests}
          disabled={running}
          className="mb-6 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? 'Running Tests...' : 'Run All Tests'}
        </button>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Test Results</h2>
            
            <div className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    result.passed 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {result.passed ? '✅' : '❌'}
                      </span>
                      <div>
                        <h3 className="font-semibold">{result.name}</h3>
                        {result.duration && (
                          <p className="text-sm text-gray-600">
                            Duration: {result.duration}ms
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-2 p-3 bg-red-100 rounded text-sm text-red-800">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="text-lg font-bold">
                Summary: {passedCount} / {results.length} tests passed
              </div>
              {passedCount === results.length && (
                <p className="text-green-600 mt-2">✨ All tests passed!</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">Testing Guide</h3>
          <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
            <li>Ensure you're logged in before running tests</li>
            <li>Tests will make real API calls to your backend</li>
            <li>Check the browser console for detailed logs</li>
            <li>Tests cover: Supabase client, API calls, error handling</li>
          </ul>
        </div>
      </div>
    </div>
  )
}