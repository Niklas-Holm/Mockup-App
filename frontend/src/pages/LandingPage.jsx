import React, { useState } from 'react'

export default function LandingPage() {
  const [companyNames, setCompanyNames] = useState('')
  const [mockups, setMockups] = useState([])
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    const names = companyNames
      .split('\n')
      .map(n => n.trim())
      .filter(Boolean)

    setMockups([])
    setLoading(true)

    for (let name of names) {
      const formData = new FormData()
      formData.append("company_name", name)

      try {
        const res = await fetch("http://localhost:8000/generate-mockup/", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()

        if (data.preview_base64) {
          const imgSrc = `data:image/jpeg;base64,${data.preview_base64}`
          setMockups(prev => [...prev, { name, src: imgSrc }])
        } else {
          console.error("No image returned for", name)
        }
      } catch (err) {
        console.error("Error generating mockup:", err)
      }
    }

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">Mockup Generator</h1>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Company Names (one per line):</label>
        <textarea
          value={companyNames}
          onChange={(e) => setCompanyNames(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded h-32"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`w-full py-3 rounded font-semibold ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {loading ? "Generating..." : "Generate Mockups"}
      </button>

      {mockups.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-4">
          {mockups.map((mockup, index) => (
            <div key={index} className="border rounded p-2 bg-white shadow-sm">
              <img src={mockup.src} alt={mockup.name} className="w-full rounded" />
              <p className="text-sm mt-2 text-center">{mockup.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
