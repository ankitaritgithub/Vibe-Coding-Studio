import React, { useMemo, useState } from 'react'
import axios from 'axios'
import * as monaco from 'monaco-editor'

type FileItem = { path: string; content: string }

export default function App() {
  const [prompt, setPrompt] = useState('Create a simple todo app with FastAPI and React')
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [rootDir, setRootDir] = useState<string>('generated_project')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedFile = useMemo(() => files.find(f => f.path === selectedPath) || null, [files, selectedPath])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post('/api/generate', { prompt })
      setFiles(data.files)
      setSelectedPath(data.files[0]?.path ?? null)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleWrite() {
    setLoading(true)
    setError(null)
    try {
      await axios.post('/api/write', { rootDir, files })
      alert('Files written successfully')
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, Arial' }}>
      <div style={{ width: 360, borderRight: '1px solid #e5e7eb', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Vibe Coding Studio</h2>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={8} style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleGenerate} disabled={loading}>{loading ? 'Generating...' : 'Generate'}</button>
          <button onClick={handleWrite} disabled={loading || files.length === 0}>Write to Disk</button>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Root directory</label>
          <input value={rootDir} onChange={e => setRootDir(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginTop: 8, fontWeight: 600 }}>Files</div>
        <div style={{ overflow: 'auto', flex: 1, border: '1px solid #e5e7eb' }}>
          {files.length === 0 ? (
            <div style={{ padding: 8, color: '#6b7280' }}>No files yet</div>
          ) : (
            files.map(f => (
              <div key={f.path} onClick={() => setSelectedPath(f.path)} style={{ padding: 8, cursor: 'pointer', background: selectedPath === f.path ? '#eef2ff' : 'transparent' }}>
                {f.path}
              </div>
            ))
          )}
        </div>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600 }}>{selectedPath || 'Preview'}</div>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <MonacoView value={selectedFile?.content || ''} path={selectedPath || ''} />
        </div>
      </div>
    </div>
  )
}

function MonacoView({ value, path }: { value: string; path: string }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  React.useEffect(() => {
    if (!containerRef.current) return
    editorRef.current = monaco.editor.create(containerRef.current, {
      value,
      language: guessLanguage(path),
      automaticLayout: true,
      theme: 'vs-dark',
      minimap: { enabled: false },
    })
    return () => editorRef.current?.dispose()
  }, [])

  React.useEffect(() => {
    editorRef.current?.setValue(value)
    monaco.editor.setModelLanguage(editorRef.current!.getModel()!, guessLanguage(path))
  }, [value, path])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}

function guessLanguage(path: string) {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript'
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript'
  if (path.endsWith('.py')) return 'python'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.css')) return 'css'
  if (path.endsWith('.html')) return 'html'
  if (path.endsWith('.md')) return 'markdown'
  return 'plaintext'
}


