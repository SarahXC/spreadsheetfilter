import { SpreadsheetFilter } from "@/components/spreadsheet-filter"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Spreadsheet Query Tool</h1>
      <SpreadsheetFilter />
    </main>
  )
}

