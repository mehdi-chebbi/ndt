'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Layer {
  id: number
  geoserver_name: string
  display_name: string | null
  group_id: number | null
  group_name: string | null
  file_path: string | null
  class_labels: { [key: string]: string } | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface Group {
  id: number
  name: string
  parent_id: number | null
  parent_name: string | null
  description: string | null
  sort_order: number
  layer_count: string
  child_count: string
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

export default function LayerManagementPage() {
  const [layers, setLayers] = useState<Layer[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ added: number; updated: number; total: number } | null>(null)

  // Active tab
  const [activeTab, setActiveTab] = useState<'layers' | 'groups'>('layers')

  // Layer form state
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false)
  const [editingLayer, setEditingLayer] = useState<Layer | null>(null)
  const [layerFormData, setLayerFormData] = useState({
    geoserver_name: '',
    display_name: '',
    group_id: '',
    file_path: '',
    class_labels: JSON.stringify(defaultClassLabels, null, 2),
    is_active: true,
    sort_order: 0
  })
  const [layerFormError, setLayerFormError] = useState('')
  const [isLayerSubmitting, setIsLayerSubmitting] = useState(false)

  // Group form state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    parent_id: '',
    description: '',
    sort_order: 0
  })
  const [groupFormError, setGroupFormError] = useState('')
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false)

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

      // Fetch layers
      const layersRes = await fetch('/api/layers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (layersRes.ok) {
        const layersData = await layersRes.json()
        setLayers(layersData.layers || [])
      }

      // Fetch groups
      const groupsRes = await fetch('/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData.groups || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Sync from GeoServer
  const handleSyncFromGeoServer = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    setError('')

    try {
      const token = localStorage.getItem('token')

      const response = await fetch('/api/clip/layers/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync layers')
      }

      setSyncResult({
        added: data.added,
        updated: data.updated,
        total: data.total
      })

      fetchData(token!)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  // Layer handlers
  const handleOpenLayerModal = (layer?: Layer) => {
    if (layer) {
      setEditingLayer(layer)
      setLayerFormData({
        geoserver_name: layer.geoserver_name,
        display_name: layer.display_name || '',
        group_id: layer.group_id ? String(layer.group_id) : '',
        file_path: layer.file_path || '',
        class_labels: layer.class_labels ? JSON.stringify(layer.class_labels, null, 2) : JSON.stringify(defaultClassLabels, null, 2),
        is_active: layer.is_active,
        sort_order: layer.sort_order
      })
    } else {
      setEditingLayer(null)
      setLayerFormData({
        geoserver_name: '',
        display_name: '',
        group_id: '',
        file_path: '',
        class_labels: JSON.stringify(defaultClassLabels, null, 2),
        is_active: true,
        sort_order: 0
      })
    }
    setLayerFormError('')
    setIsLayerModalOpen(true)
  }

  const handleCloseLayerModal = () => {
    setIsLayerModalOpen(false)
    setEditingLayer(null)
    setLayerFormError('')
  }

  const handleSubmitLayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLayerFormError('')
    setIsLayerSubmitting(true)

    const token = localStorage.getItem('token')

    try {
      let classLabelsObj = null
      if (layerFormData.class_labels.trim()) {
        try {
          classLabelsObj = JSON.parse(layerFormData.class_labels)
        } catch {
          setLayerFormError('Invalid JSON format for class labels')
          setIsLayerSubmitting(false)
          return
        }
      }

      const url = editingLayer
        ? `/api/layers/${editingLayer.id}`
        : '/api/layers'

      const method = editingLayer ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          geoserver_name: layerFormData.geoserver_name,
          display_name: layerFormData.display_name || null,
          group_id: layerFormData.group_id ? parseInt(layerFormData.group_id) : null,
          file_path: layerFormData.file_path || null,
          class_labels: classLabelsObj,
          is_active: layerFormData.is_active,
          sort_order: layerFormData.sort_order
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      handleCloseLayerModal()
      fetchData(token!)
    } catch (err: any) {
      setLayerFormError(err.message)
    } finally {
      setIsLayerSubmitting(false)
    }
  }

  const handleDeleteLayer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this layer?')) {
      return
    }

    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`/api/layers/${id}`, {
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

  const handleToggleLayerActive = async (layer: Layer) => {
    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`/api/layers/${layer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: !layer.is_active
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update')
      }

      fetchData(token!)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Group handlers
  const handleOpenGroupModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group)
      setGroupFormData({
        name: group.name,
        parent_id: group.parent_id ? String(group.parent_id) : '',
        description: group.description || '',
        sort_order: group.sort_order
      })
    } else {
      setEditingGroup(null)
      setGroupFormData({
        name: '',
        parent_id: '',
        description: '',
        sort_order: 0
      })
    }
    setGroupFormError('')
    setIsGroupModalOpen(true)
  }

  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false)
    setEditingGroup(null)
    setGroupFormError('')
  }

  const handleSubmitGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setGroupFormError('')
    setIsGroupSubmitting(true)

    const token = localStorage.getItem('token')

    try {
      const url = editingGroup
        ? `/api/groups/${editingGroup.id}`
        : '/api/groups'

      const method = editingGroup ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupFormData.name,
          parent_id: groupFormData.parent_id ? parseInt(groupFormData.parent_id) : null,
          description: groupFormData.description || null,
          sort_order: groupFormData.sort_order
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      handleCloseGroupModal()
      fetchData(token!)
    } catch (err: any) {
      setGroupFormError(err.message)
    } finally {
      setIsGroupSubmitting(false)
    }
  }

  const handleDeleteGroup = async (id: number) => {
    const group = groups.find(g => g.id === id)
    const hasChildren = group && parseInt(group.child_count) > 0
    
    const message = hasChildren
      ? 'This group has child groups that will also be deleted. Layers will become ungrouped. Are you sure?'
      : 'Layers in this group will become ungrouped. Are you sure?'
    
    if (!confirm(message)) {
      return
    }

    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`/api/groups/${id}`, {
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

  // Get parent groups (for dropdown - exclude current group and its descendants)
  const getParentGroupOptions = (excludeId?: number) => {
    return groups.filter(g => {
      if (excludeId && g.id === excludeId) return false
      // Could add more logic to exclude descendants
      return true
    })
  }

  // Build group tree for display
  const buildGroupTree = () => {
    const groupMap: { [key: number]: any } = {}
    groups.forEach(g => {
      groupMap[g.id] = { ...g, children: [] }
    })

    const rootGroups: any[] = []
    groups.forEach(g => {
      if (g.parent_id && groupMap[g.parent_id]) {
        groupMap[g.parent_id].children.push(groupMap[g.id])
      } else {
        rootGroups.push(groupMap[g.id])
      }
    })

    return rootGroups
  }

  // Render group tree recursively
  const renderGroupTree = (groupList: any[], depth = 0) => {
    return groupList.map(group => (
      <div key={group.id}>
        <div 
          className="p-4 hover:bg-gray-50 flex justify-between items-center"
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          <div className="flex items-center gap-2">
            {group.children?.length > 0 && (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{group.name}</h3>
              {group.description && (
                <p className="text-gray-500 text-sm">{group.description}</p>
              )}
              <div className="flex gap-4 text-xs text-gray-400 mt-1">
                <span>{group.layer_count || 0} layers</span>
                <span>{group.child_count || 0} subgroups</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenGroupModal(group)}
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteGroup(group.id)}
              className="text-red-600 hover:text-red-800 font-medium text-sm"
            >
              Delete
            </button>
          </div>
        </div>
        {group.children?.length > 0 && renderGroupTree(group.children, depth + 1)}
      </div>
    ))
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

  const configuredForStats = layers.filter(l => l.file_path && l.class_labels).length
  const activeLayers = layers.filter(l => l.is_active).length
  const ungroupedLayers = layers.filter(l => !l.group_id).length

  // Get all groups for layer dropdown (flatten with indentation)
  const getFlatGroupOptions = () => {
    const options: { id: number; name: string; depth: number }[] = []
    const addGroup = (groupList: any[], depth = 0) => {
      groupList.forEach(g => {
        options.push({ id: g.id, name: g.name, depth })
        if (g.children?.length > 0) {
          addGroup(g.children, depth + 1)
        }
      })
    }
    addGroup(buildGroupTree())
    return options
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
              <h1 className="text-2xl font-bold text-gray-900">Layer Management</h1>
              <p className="text-gray-600 mt-1">Manage groups and layers for the map</p>
            </div>
          </div>
          <button
            onClick={() => handleSyncFromGeoServer()}
            disabled={isSyncing}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 ${
              isSyncing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSyncing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync from GeoServer
              </>
            )}
          </button>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Sync complete:</span>
              <span>{syncResult.added} added, {syncResult.updated} updated, {syncResult.total} total layers</span>
              <button
                onClick={() => setSyncResult(null)}
                className="ml-auto text-green-700 hover:text-green-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Total Layers</p>
            <p className="text-3xl font-bold text-gray-900">{layers.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Active Layers</p>
            <p className="text-3xl font-bold text-green-600">{activeLayers}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Groups</p>
            <p className="text-3xl font-bold text-blue-600">{groups.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Stats Ready</p>
            <p className="text-3xl font-bold text-purple-600">{configuredForStats}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Ungrouped</p>
            <p className="text-3xl font-bold text-amber-600">{ungroupedLayers}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('layers')}
            className={`px-6 py-3 text-sm font-semibold transition ${
              activeTab === 'layers'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Layers ({layers.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-6 py-3 text-sm font-semibold transition ${
              activeTab === 'groups'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Groups ({groups.length})
          </button>
        </div>

        {/* Layers Tab */}
        {activeTab === 'layers' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">All Layers</h2>
              <button
                onClick={() => handleOpenLayerModal()}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm"
              >
                + Add Layer
              </button>
            </div>

            {layers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">No layers found</p>
                <p className="text-gray-400 text-sm mt-1">Click "Sync from GeoServer" to fetch layers</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Layer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stats Ready
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {layers.map((layer) => (
                      <tr key={layer.id} className={`hover:bg-gray-50 ${!layer.is_active ? 'bg-gray-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {layer.display_name || layer.geoserver_name}
                            </div>
                            <div className="text-xs text-gray-500">{layer.geoserver_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {layer.group_name ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {layer.group_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Ungrouped</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleLayerActive(layer)}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              layer.is_active
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {layer.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {layer.file_path && layer.class_labels ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Ready
                            </span>
                          ) : (
                            <span className="text-amber-600 text-sm">Needs config</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleOpenLayerModal(layer)}
                            className="text-gray-900 hover:text-gray-700 mr-4 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLayer(layer.id)}
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
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Layer Groups (Nested)</h2>
              <button
                onClick={() => handleOpenGroupModal()}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm"
              >
                + Add Group
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-600">No groups created yet</p>
                <p className="text-gray-400 text-sm mt-1">Create groups to organize your layers</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {renderGroupTree(buildGroupTree())}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Layer Modal */}
      {isLayerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLayer ? 'Edit Layer' : 'Add Layer'}
              </h3>
            </div>

            <form onSubmit={handleSubmitLayer} className="p-6 space-y-4">
              {layerFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {layerFormError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GeoServer Layer Name *
                </label>
                <input
                  type="text"
                  value={layerFormData.geoserver_name}
                  onChange={(e) => setLayerFormData({ ...layerFormData, geoserver_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., LC:LandcoverOSS2000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={layerFormData.display_name}
                  onChange={(e) => setLayerFormData({ ...layerFormData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., Land Cover 2000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group
                </label>
                <select
                  value={layerFormData.group_id}
                  onChange={(e) => setLayerFormData({ ...layerFormData, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">No Group (Ungrouped)</option>
                  {getFlatGroupOptions().map((g) => (
                    <option key={g.id} value={g.id}>
                      {'  '.repeat(g.depth)}{g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Path (for stats)
                </label>
                <input
                  type="text"
                  value={layerFormData.file_path}
                  onChange={(e) => setLayerFormData({ ...layerFormData, file_path: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., /data/rasters/LandcoverOSS2000.tif"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Labels (JSON)
                </label>
                <textarea
                  value={layerFormData.class_labels}
                  onChange={(e) => setLayerFormData({ ...layerFormData, class_labels: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
                  rows={10}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="layer_is_active"
                    checked={layerFormData.is_active}
                    onChange={(e) => setLayerFormData({ ...layerFormData, is_active: e.target.checked })}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                  />
                  <label htmlFor="layer_is_active" className="ml-2 text-sm text-gray-700">
                    Active (visible on map)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={layerFormData.sort_order}
                    onChange={(e) => setLayerFormData({ ...layerFormData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseLayerModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLayerSubmitting}
                  className={`px-4 py-2 bg-gray-900 text-white rounded-lg transition font-medium ${
                    isLayerSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                  }`}
                >
                  {isLayerSubmitting ? 'Saving...' : (editingLayer ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingGroup ? 'Edit Group' : 'Add Group'}
              </h3>
            </div>

            <form onSubmit={handleSubmitGroup} className="p-6 space-y-4">
              {groupFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {groupFormError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., LC, NDVI, NDWI"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Group
                </label>
                <select
                  value={groupFormData.parent_id}
                  onChange={(e) => setGroupFormData({ ...groupFormData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">No Parent (Root Group)</option>
                  {getParentGroupOptions(editingGroup?.id).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a parent to create nested groups
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., Land Cover layers"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={groupFormData.sort_order}
                  onChange={(e) => setGroupFormData({ ...groupFormData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseGroupModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGroupSubmitting}
                  className={`px-4 py-2 bg-gray-900 text-white rounded-lg transition font-medium ${
                    isGroupSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                  }`}
                >
                  {isGroupSubmitting ? 'Saving...' : (editingGroup ? 'Update' : 'Create')}
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
