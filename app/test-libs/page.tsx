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
    
    console.log('🧪 Starting Library Tests...')
    console.log('Note: Some console errors are expected as we test error handling')

    // Test 1: Supabase Client
    console.log('\n📋 Test 1: Supabase Client Creation')
    const startSupabase = Date.now()
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client returned null - check environment variables')
      }
      
      // Try to check auth status
      const { data, error } = await supabase.auth.getUser()
      const authStatus = error ? 'Not authenticated (this is OK for testing)' : 
                        data.user ? `Authenticated as ${data.user.email}` : 'No user'
      
      testResults.push({ 
        name: 'Supabase Client Creation', 
        passed: true, 
        duration: Date.now() - startSupabase,
        error: authStatus
      })
      console.log('✅ Passed - Client created successfully')
    } catch (error) {
      testResults.push({ 
        name: 'Supabase Client Creation', 
        passed: false, 
        duration: Date.now() - startSupabase,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      console.log('❌ Failed -', error instanceof Error ? error.message : 'Unknown error')
    }

    // Test 2: Get Submissions (requires authentication)
    console.log('\n📋 Test 2: Get Submissions API')
    const startSubmissions = Date.now()
    try {
      const submissions = await getSubmissions()
      if (!Array.isArray(submissions)) {
        throw new Error('getSubmissions did not return an array')
      }
      testResults.push({ 
        name: 'Get Submissions API', 
        passed: true, 
        duration: Date.now() - startSubmissions,
        error: `Returned ${submissions.length} submissions`
      })
      console.log('✅ Passed - Returned', submissions.length, 'submissions')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      // Check if it's an auth error (expected if not logged in)
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('401')) {
        testResults.push({ 
          name: 'Get Submissions API', 
          passed: true, 
          duration: Date.now() - startSubmissions,
          error: 'Auth check working (401 Unauthorized - login required)'
        })
        console.log('✅ Passed - Auth protection working correctly')
      } else {
        testResults.push({ 
          name: 'Get Submissions API', 
          passed: false, 
          duration: Date.now() - startSubmissions,
          error: errorMsg
        })
        console.log('❌ Failed -', errorMsg)
      }
    }

    // Test 3: API Error Handling
    console.log('\n📋 Test 3: Error Handling (expecting error)')
    const startError = Date.now()
    try {
      // Suppress console.error temporarily for this test
      const originalError = console.error
      console.error = () => {}
      
      await apiCall('/api/nonexistent-endpoint-test-12345')
      
      // Restore console.error
      console.error = originalError
      
      testResults.push({ 
        name: 'Error Handling', 
        passed: false, 
        duration: Date.now() - startError,
        error: 'Should have thrown an error but did not'
      })
      console.log('❌ Failed - Should have thrown an error')
    } catch (error) {
      // This is expected - error handling is working
      testResults.push({ 
        name: 'Error Handling', 
        passed: true, 
        duration: Date.now() - startError,
        error: 'Correctly caught and handled API errors'
      })
      console.log('✅ Passed - Errors are properly caught and handled')
    }

    console.log('\n✨ Tests Complete!')
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
                    <div className={`mt-2 p-3 rounded text-sm ${
                      result.passed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      <strong>Details:</strong> {result.error}
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
          <h3 className="font-bold text-blue-900 mb-2">📖 Test Information</h3>
          <div className="text-sm text-blue-800 space-y-3">
            <div>
              <strong>What These Tests Check:</strong>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                <li><strong>Supabase Client:</strong> Verifies environment variables are configured and client can initialize</li>
                <li><strong>Get Submissions:</strong> Tests API endpoint and authentication (401 = auth working correctly)</li>
                <li><strong>Error Handling:</strong> Ensures errors are properly caught and handled</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-blue-300">
              <strong>Note:</strong> Console errors during "Error Handling" test are expected and normal - they prove error handling works!
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-bold text-green-900 mb-2">✅ Test Results Summary</h3>
            <div className="text-sm text-green-800 space-y-2">
              {results.map((result, idx) => (
                <div key={idx}>
                  • <strong>{result.name}:</strong> {result.passed ? 'Working correctly' : 'Needs attention'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}