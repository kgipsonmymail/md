import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { LayoutDashboard, PenTool, Upload as UploadIcon } from 'lucide-react'
import Gallery from './pages/Gallery'
import Editor from './pages/Editor'
import Upload from './pages/Upload'
import ContentOptimizer from './pages/ContentOptimizer'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="font-bold text-lg flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                <span>Wind 草稿台</span>
              </Link>
              <nav className="hidden md:flex gap-4">
                <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">草稿列表</Link>
                <Link to="/editor" className="text-sm font-medium text-muted-foreground hover:text-foreground">新建草稿</Link>
                <Link to="/upload" className="text-sm font-medium text-muted-foreground hover:text-foreground">上传文档</Link>
              </nav>
            </div>
            <div>
              <Link to="/editor" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2">
                <PenTool className="w-4 h-4" /> 去写作
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/content-optimizer" element={<ContentOptimizer />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
