'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const sans = { fontFamily: 'system-ui, sans-serif' }
const serif = { fontFamily: "'Georgia', serif" }

interface FileEntry {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  extension?: string
  children?: FileEntry[]
}

/* ── Helpers ──────────────────────────────────────────────────── */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function countFiles(entry: FileEntry): number {
  if (entry.type === 'file') return 1
  return (entry.children || []).reduce((sum, child) => sum + countFiles(child), 0)
}

function getFileIcon(ext?: string) {
  switch (ext) {
    case 'pdf':
      return (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    case 'doc':
    case 'docx':
      return (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    case 'csv':
    case 'xlsx':
    case 'xls':
      return (
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
  }
}

function getExtLabel(ext?: string): string {
  switch (ext) {
    case 'pdf': return 'PDF'
    case 'doc': case 'docx': return 'Word'
    case 'csv': return 'CSV'
    case 'xlsx': case 'xls': return 'Excel'
    default: return (ext || 'FILE').toUpperCase()
  }
}

function getExtBadgeColor(ext?: string): string {
  switch (ext) {
    case 'pdf': return 'bg-red-400/10 text-red-400 border-red-400/20'
    case 'doc': case 'docx': return 'bg-blue-400/10 text-blue-400 border-blue-400/20'
    case 'csv': case 'xlsx': case 'xls': return 'bg-green-400/10 text-green-400 border-green-400/20'
    default: return 'bg-gray-400/10 text-gray-400 border-gray-400/20'
  }
}

/* ── Search: flatten tree ─────────────────────────────────────── */
interface FlatFile {
  name: string
  path: string
  size?: number
  extension?: string
  folderPath: string
}

function flattenTree(entries: FileEntry[], parentPath: string = ''): FlatFile[] {
  const result: FlatFile[] = []
  for (const entry of entries) {
    if (entry.type === 'file') {
      result.push({
        name: entry.name,
        path: entry.path,
        size: entry.size,
        extension: entry.extension,
        folderPath: parentPath,
      })
    } else if (entry.children) {
      result.push(...flattenTree(entry.children, parentPath ? `${parentPath} / ${entry.name}` : entry.name))
    }
  }
  return result
}

/* ── FolderRow component ──────────────────────────────────────── */
function FolderRow({ entry, depth, searchQuery, t }: { entry: FileEntry; depth: number; searchQuery: string; t: (key: string, options?: Record<string, unknown>) => string }) {
  const [isOpen, setIsOpen] = useState(searchQuery.length > 0)
  const fileCount = countFiles(entry)

  return (
    <div>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-white/[0.03] transition-colors duration-150 text-left group"
        style={{ paddingLeft: `${depth * 24 + 16}px` }}
      >
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Folder icon */}
        <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>

        {/* Name */}
        <span className="text-sm text-gray-200 font-medium flex-1" style={sans}>
          {entry.name}
        </span>

        {/* File count */}
        <span className="text-xs text-gray-500" style={sans}>
          {t('fileCount', { count: fileCount })}
        </span>
      </button>

      {/* Children */}
      {isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            child.type === 'folder' ? (
              <FolderRow key={child.path} entry={child} depth={depth + 1} searchQuery={searchQuery} t={t} />
            ) : (
              <FileRow key={child.path} entry={child} depth={depth + 1} t={t} />
            )
          ))}
        </div>
      )}
    </div>
  )
}

/* ── FileRow component ────────────────────────────────────────── */
function FileRow({ entry, depth, t }: { entry: FileEntry; depth: number; t: (key: string, options?: Record<string, unknown>) => string }) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 px-4 rounded-lg hover:bg-white/[0.03] transition-colors duration-150 group"
      style={{ paddingLeft: `${depth * 24 + 16}px` }}
    >
      {/* File icon */}
      {getFileIcon(entry.extension)}

      {/* Name */}
      <span className="text-sm text-gray-300 flex-1 truncate" style={sans}>
        {entry.name}
      </span>

      {/* Extension badge */}
      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium shrink-0 ${getExtBadgeColor(entry.extension)}`} style={sans}>
        {getExtLabel(entry.extension)}
      </span>

      {/* Size */}
      {entry.size !== undefined && (
        <span className="text-xs text-gray-500 shrink-0 w-16 text-right" style={sans}>
          {formatSize(entry.size)}
        </span>
      )}

      {/* Download button */}
      <a
        href={`/api/resources/download?file=${encodeURIComponent(entry.path)}`}
        download
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 p-1.5 rounded-md hover:bg-green-400/10"
        title={t('download')}
      >
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    </div>
  )
}

/* ── Search result row ────────────────────────────────────────── */
function SearchResultRow({ file, t }: { file: FlatFile; t: (key: string) => string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 rounded-lg hover:bg-white/[0.03] transition-colors duration-150 group">
      {getFileIcon(file.extension)}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-300 block truncate" style={sans}>{file.name}</span>
        <span className="text-xs text-gray-500" style={sans}>{file.folderPath}</span>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium shrink-0 ${getExtBadgeColor(file.extension)}`} style={sans}>
        {getExtLabel(file.extension)}
      </span>
      {file.size !== undefined && (
        <span className="text-xs text-gray-500 shrink-0 w-16 text-right" style={sans}>
          {formatSize(file.size)}
        </span>
      )}
      <a
        href={`/api/resources/download?file=${encodeURIComponent(file.path)}`}
        download
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 p-1.5 rounded-md hover:bg-green-400/10"
        title={t('download')}
      >
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────── */
export default function ResourcesPage() {
  const [tree, setTree] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { t } = useTranslation('resources')

  useEffect(() => {
    fetch('/api/resources')
      .then(res => res.json())
      .then(data => {
        setTree(data.tree || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const flatFiles = useMemo(() => flattenTree(tree), [tree])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return flatFiles.filter(f => f.name.toLowerCase().includes(q) || f.folderPath.toLowerCase().includes(q))
  }, [searchQuery, flatFiles])

  const totalFiles = flatFiles.length

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white" style={serif}>
      {/* Ambient background grid */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div style={{
          backgroundImage: `linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          width: '100%',
          height: '100%',
        }} />
        <div style={{
          position: 'absolute', top: '5%', left: '10%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', right: '8%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </div>

      {/* Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
        <div className="pt-20 pb-24 lg:pt-28 lg:pb-32">

          {/* ── Hero ─────────────────────────────────────────────── */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] text-green-400/80" style={sans}>
                {t('eyebrow')}
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.1] mb-6" style={{ ...serif, letterSpacing: '-0.02em' }}>
              {t('heading')}
            </h1>

            <p className="text-lg text-gray-400 max-w-3xl mb-4 leading-relaxed" style={sans}>
              {t('description')}
            </p>

            <p className="text-sm text-green-400/90 font-medium mb-6" style={{ ...sans, letterSpacing: '0.02em' }}>
              {t('tagline')}
            </p>

            <p className="text-base text-gray-300 max-w-3xl mb-4 leading-relaxed" style={sans}>
              {t('intro1')}
            </p>

            <p className="text-base text-gray-300 max-w-3xl leading-relaxed" style={sans}>
              {t('intro2')}
            </p>
          </div>

          {/* ── Search bar ───────────────────────────────────────── */}
          <div className="mb-10">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-colors duration-200"
                style={sans}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Stats ────────────────────────────────────────────── */}
          {!loading && (
            <div className="flex items-center gap-6 mb-8">
              <span className="text-xs text-gray-500" style={sans}>
                {t('fileStats', { fileCount: totalFiles, folderCount: tree.length })}
              </span>
            </div>
          )}

          {/* ── Content ──────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            </div>
          ) : searchQuery.trim() ? (
            /* Search results */
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <p className="text-sm text-gray-400" style={sans}>
                  {t('searchResults', { count: searchResults.length, query: searchQuery })}
                </p>
              </div>
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((file) => (
                    <SearchResultRow key={file.path} file={file} t={t} />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-500" style={sans}>{t('noFilesFound')}</p>
                </div>
              )}
            </div>
          ) : (
            /* Folder tree */
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="p-2">
                {tree.map((entry) => (
                  <FolderRow key={entry.path} entry={entry} depth={0} searchQuery={searchQuery} t={t} />
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}