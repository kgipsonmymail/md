import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { LayoutDashboard, PenTool } from 'lucide-react'
import Gallery from './pages/Gallery'
import Editor from './pages/Editor'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="font-bold text-lg flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                <span>Wind Drafts</span>
              </Link>
              <nav className="hidden md:flex gap-4">
                <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">Gallery</Link>
                <Link to="/editor" className="text-sm font-medium text-muted-foreground hover:text-foreground">New Draft</Link>
              </nav>
            </div>
            <div>
              <Link to="/editor" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2">
                <PenTool className="w-4 h-4" /> Write
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:id" element={<Editor />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
