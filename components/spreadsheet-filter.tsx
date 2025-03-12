"use client"

import type React from "react"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Search, Download, FileSpreadsheet } from "lucide-react"

export function SpreadsheetFilter() {
  const [file, setFile] = useState<File | null>(null)
  const [query, setQuery] = useState("")
  const [data, setData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const uploadedFile = files[0]
    setFile(uploadedFile)
    setError("")

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const binaryStr = event.target?.result
        const workbook = XLSX.read(binaryStr, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          setError("The spreadsheet appears to be empty")
          return
        }

        setData(jsonData)
        setFilteredData(jsonData)
        setColumns(Object.keys(jsonData[0]))
      } catch (err) {
        setError("Failed to parse the spreadsheet. Please ensure it's a valid Excel or CSV file.")
        console.error(err)
      }
    }
    reader.onerror = () => {
      setError("Failed to read the file")
    }
    reader.readAsBinaryString(uploadedFile)
  }

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value)
  }

  const processQuery = () => {
    if (!data.length) {
      setError("Please upload a spreadsheet first")
      return
    }

    if (!query.trim()) {
      setFilteredData(data)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Simple query parsing logic
      const queryLower = query.toLowerCase()

      // Extract potential column names and values from the query
      const result = parseNaturalLanguageQuery(queryLower, data, columns)

      setFilteredData(result)
      setIsLoading(false)
    } catch (err) {
      setError("Failed to process your query. Please try a simpler query.")
      setIsLoading(false)
      console.error(err)
    }
  }

  const parseNaturalLanguageQuery = (query: string, data: any[], columns: string[]) => {
    // This is a simplified parser that looks for patterns like:
    // "give me all [role] in [location]" or "show [role] with [attribute] [operator] [value]"

    let filtered = [...data]

    // Check for location-based filtering
    const locationMatch = query.match(/in\s+([a-z0-9\s]+)$/i)
    if (locationMatch) {
      const location = locationMatch[1].trim()

      // Try to find a location column (city, location, etc.)
      const locationColumns = columns.filter((col) =>
        ["city", "location", "state", "country", "address"].includes(col.toLowerCase()),
      )

      if (locationColumns.length > 0) {
        filtered = filtered.filter((row) => {
          return locationColumns.some((col) => String(row[col]).toLowerCase().includes(location.toLowerCase()))
        })
      }
    }

    // Check for role/title-based filtering
    const roleMatches = [
      /all\s+([a-z0-9\s]+)\s+in/i,
      /^([a-z0-9\s]+)\s+in/i,
      /show\s+([a-z0-9\s]+)/i,
      /give\s+me\s+([a-z0-9\s]+)/i,
    ]

    for (const pattern of roleMatches) {
      const roleMatch = query.match(pattern)
      if (roleMatch) {
        const role = roleMatch[1].trim()

        // Try to find a role/title column
        const roleColumns = columns.filter((col) =>
          ["role", "title", "position", "job", "occupation"].includes(col.toLowerCase()),
        )

        if (roleColumns.length > 0) {
          filtered = filtered.filter((row) => {
            return roleColumns.some((col) => String(row[col]).toLowerCase().includes(role.toLowerCase()))
          })
          break
        }
      }
    }

    return filtered
  }

  const downloadFilteredData = () => {
    if (!filteredData.length) return

    const worksheet = XLSX.utils.json_to_sheet(filteredData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Data")

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const fileName = `filtered_data_${timestamp}.xlsx`

    XLSX.writeFile(workbook, fileName)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Spreadsheet Query Tool</CardTitle>
        <CardDescription>Upload a spreadsheet and filter it using natural language queries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="file-upload" className="block text-sm font-medium">
            Upload Spreadsheet (Excel or CSV)
          </label>
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {file ? "Change File" : "Select File"}
              </label>
            </Button>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{file.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="query" className="block text-sm font-medium">
            Enter your query
          </label>
          <Textarea
            id="query"
            placeholder="Example: 'give me all software engineers in SF' or 'show managers in New York'"
            value={query}
            onChange={handleQueryChange}
            rows={2}
            className="resize-none"
          />
          <Button onClick={processQuery} disabled={isLoading || !data.length} className="w-full sm:w-auto">
            <Search className="h-4 w-4 mr-2" />
            Run Query
          </Button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}

        {filteredData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Results: {filteredData.length} of {data.length} rows
              </h3>
              <Button variant="outline" size="sm" onClick={downloadFilteredData} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Results
              </Button>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Preview of filtered data
              </h3>

              <div className="border rounded-md overflow-auto max-h-[400px] bg-background">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column} className="font-semibold">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 10).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {columns.map((column) => (
                          <TableCell key={`${rowIndex}-${column}`}>
                            {row[column] !== undefined ? String(row[column]) : ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredData.length > 10 && (
                  <div className="p-3 text-center text-sm text-muted-foreground border-t">
                    Showing 10 of {filteredData.length} results. Download the file to see all data.
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Button onClick={downloadFilteredData} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Complete Results
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
        <p>
          <strong>Example queries:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>give me all software engineers in SF</li>
          <li>show managers in New York</li>
          <li>all designers in remote locations</li>
        </ul>
      </CardFooter>
    </Card>
  )
}

