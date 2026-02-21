'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LayerMetadata {
  id: number
  geoserver_name: string
  file_path: string
  class_labels: { [key: number]: string }
  created_at: string
  updated_at: string
}

interface GeoServerLayer {
  id: string
  name: string
  layerName: string
}

const defaultClassLabels = {
  "1": "Forêt",
  "2": "Parcours",
  "3": "Agriculture irriguée",
  "4": "Agriculture pluviale",
  "5": "Oasis",
  "6": "Plan d'eau",
  "7": "Urbain",
  "8": "Sol nu",
  "9": "Etendue dunaire"
}

export default function LayerMetadataPage() {
  const [metadata, setMetadata] = useState<LayerMetadata[]>([])
  const [geoserverLayers, setGeoserverLayers] = useState<GeoServerLayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMetadata, setEditingMetadata] = useState<LayerMetadata | null>(null)
  const [formData, setFormData] = useState({
    geoserver_name: '',
    file_path: '',
    class_labels: JSON.stringify(defaultClassLabels, null, 2)
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    if (!token || user.role !== 'admin') {
      router.push('/login')
      return
    }

    setCurrentUser(user)
    fetchData(token)
  }, [router])

  const fetchData = async (token: string) => {
    try {
      setLoading(true)
      
      // Fetch layer metadata
      const metadataRes = await fetch('/api/layers/metadata', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const metadataData = await metadataRes.json()
      
      // Fetch GeoServer layers
      const geoserverRes = await fetch('/api/clip/layers')
      const geoserverData = await geoserverRes.json()

      if (metadataRes.ok) {
        setMetadata(metadataData.metadata || [])
      }
      
      if (geoserverRes.ok) {
        setGeoserverLayers(geoserverData || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (item?: LayerMetadata) => {
    if (item) {
      setEditingMetadata(item)
      setFormData({
        geoserver_name: item.geoserver_name,
        file_path: item.file_path,
        class_labels: JSON.stringify(item.class_labels, null, 2)
      })
    } else {
      setEditingMetadata(null)
      setFormData({
        geoserver_name: '',
        file_path: '',
        class_labels: JSON.stringify(defaultClassLabels, null, 2)
      })
    }
    setFormError('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingMetadata(null)
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    const token = localStorage.getItem('token')
    
    try {
      let classLabelsObj
      try {
        classLabelsObj = JSON.parse(formData.class_labels)
      } catch {
        setFormError('Invalid JSON format for class labels')
        setIsSubmitting(false)
        return
      }

      const url = editingMetadata 
        ? `/api/layers/metadata/${editingMetadata.id}`
        : '/api/layers/metadata'
      
      const method = editingMetadata ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          geoserver_name: formData.geoserver_name,
          file_path: formData.file_path,
          class_labels: classLabelsObj
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      handleCloseModal()
      fetchData(token!)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this layer metadata?')) {
      return
    }

    const token = localStorage.getItem('token')
    
    try {
      const response = await fetch(`/api/layers/metadata/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      fetchData(token!)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Get unconfigured layers (in GeoServer but not in metadata)
  const getConfiguredLayerNames = () => new Set(metadata.map(m => m.geoserver_name))
  
  const isLayerConfigured = (layerName: string) => {
    const configured = getConfiguredLayerNames()
    return configured.has(layerName) || configured.has(layerName.split(':').pop() || '')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin" 
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Layer Metadata Management</h1>
              <p className="text-gray-600 mt-1">Configure file paths and class labels for statistics</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium"
          >
            + Add Metadata
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">GeoServer Layers</p>
            <p className="text-3xl font-bold text-gray-900">{geoserverLayers.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Configured for Stats</p>
            <p className="text-3xl font-bold text-green-600">{metadata.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Needs Configuration</p>
            <p className="text-3xl font-bold text-amber-600">
              {geoserverLayers.filter(l => !isLayerConfigured(l.layerName)).length}
            </p>
          </div>
        </div>

        {/* Layer Metadata Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Configured Layers</h2>
          </div>

          {metadata.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600">No layer metadata configured yet</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-4 text-gray-900 font-medium hover:underline"
              >
                Add your first layer
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GeoServer Layer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Path
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Classes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metadata.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{item.geoserver_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{item.file_path}</code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {Object.keys(item.class_labels).length} classes
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="text-gray-900 hover:text-gray-700 mr-4 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Unconfigured Layers */}
        {geoserverLayers.filter(l => !isLayerConfigured(l.layerName)).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-amber-50">
              <h2 className="text-lg font-semibold text-amber-800">
                ⚠️ Layers Needing Configuration
              </h2>
              <p className="text-amber-700 text-sm mt-1">
                These layers are in GeoServer but need file path configuration for stats
              </p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {geoserverLayers
                  .filter(l => !isLayerConfigured(l.layerName))
                  .map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => handleOpenModal()}
                      className="px-3 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition text-sm font-medium"
                    >
                      {layer.layerName}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingMetadata ? 'Edit Layer Metadata' : 'Add Layer Metadata'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GeoServer Layer Name *
                </label>
                {editingMetadata ? (
                  <input
                    type="text"
                    value={formData.geoserver_name}
                    onChange={(e) => setFormData({ ...formData, geoserver_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="e.g., LC:LandcoverOSS2000"
                  />
                ) : (
                  <select
                    value={formData.geoserver_name}
                    onChange={(e) => setFormData({ ...formData, geoserver_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select a layer...</option>
                    {geoserverLayers.map((layer) => (
                      <option key={layer.id} value={layer.layerName}>
                        {layer.layerName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Path *
                </label>
                <input
                  type="text"
                  value={formData.file_path}
                  onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., /data/rasters/LandcoverOSS2000.tif"
                />
                <p className="text-xs text-gray-500 mt-1">Absolute path to the raster file on the server</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Labels (JSON) *
                </label>
                <textarea
                  value={formData.class_labels}
                  onChange={(e) => setFormData({ ...formData, class_labels: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
                  rows={10}
                />
                <p className="text-xs text-gray-500 mt-1">Map of class IDs to class names</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-gray-900 text-white rounded-lg transition font-medium ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : (editingMetadata ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            © 2025 Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
