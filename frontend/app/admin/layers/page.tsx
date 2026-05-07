'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/authFetch'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

interface LegendItem {
  class: string | { en: string; fr: string }
  color: string
}

interface Layer {
  id: number
  geoserver_name: string
  display_name: string | null
  group_id: number | null
  group_name: string | null
  group_legend: LegendItem[] | null
  file_path: string | null
  class_labels: { [key: string]: string } | null
  legend: LegendItem[] | null
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
  legend: LegendItem[] | null
  sort_order: number
  layer_count: string
  child_count: string
}

const defaultClassLabels = {
  "1": { en: "Forest", fr: "Forêt" },
  "2": { en: "Pasture", fr: "Parcours" },
  "3": { en: "Irrigated agriculture", fr: "Agriculture irriguée" },
  "4": { en: "Rainfed agriculture", fr: "Agriculture pluviale" },
  "5": { en: "Oasis", fr: "Oasis" },
  "6": { en: "Water body", fr: "Plan d'eau" },
  "7": { en: "Urban", fr: "Urbain" },
  "8": { en: "Bare soil", fr: "Sol nu" },
  "9": { en: "Sand dune", fr: "Étendue dunaire" }
}

export default function LayerManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation('admin')
  const [layers, setLayers] = useState<Layer[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
    legend: [] as LegendItem[],
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
    legend: [] as LegendItem[],
    sort_order: 0
  })
  const [groupFormError, setGroupFormError] = useState('')
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/login'
      return
    }

    if (!authLoading && user && user.role === 'admin') {
      fetchData()
    }
  }, [authLoading, user])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch layers
      const layersRes = await api.get('/layers')
      if (layersRes.ok) {
        const layersData = await layersRes.json()
        setLayers(layersData.layers || [])
      }

      // Fetch groups
      const groupsRes = await api.get('/groups')
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
      const response = await api.post('/clip/layers/sync')

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('layers.errors.failedToSyncLayers'))
      }

      setSyncResult({
        added: data.added,
        updated: data.updated,
        total: data.total
      })

      fetchData()
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
        legend: layer.legend || [],
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
        legend: [],
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

    try {
      let classLabelsObj = null
      if (layerFormData.class_labels.trim()) {
        try {
          classLabelsObj = JSON.parse(layerFormData.class_labels)
        } catch {
          setLayerFormError(t('layers.errors.invalidJsonFormat'))
          setIsLayerSubmitting(false)
          return
        }
      }

      const response = editingLayer
        ? await api.put(`/layers/${editingLayer.id}`, {
            geoserver_name: layerFormData.geoserver_name,
            display_name: layerFormData.display_name || null,
            group_id: layerFormData.group_id ? parseInt(layerFormData.group_id) : null,
            file_path: layerFormData.file_path || null,
            class_labels: classLabelsObj,
            legend: layerFormData.legend.length > 0 ? layerFormData.legend : null,
            is_active: layerFormData.is_active,
            sort_order: layerFormData.sort_order
          })
        : await api.post('/layers', {
            geoserver_name: layerFormData.geoserver_name,
            display_name: layerFormData.display_name || null,
            group_id: layerFormData.group_id ? parseInt(layerFormData.group_id) : null,
            file_path: layerFormData.file_path || null,
            class_labels: classLabelsObj,
            legend: layerFormData.legend.length > 0 ? layerFormData.legend : null,
            is_active: layerFormData.is_active,
            sort_order: layerFormData.sort_order
          })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('layers.errors.failedToSave'))
      }

      handleCloseLayerModal()
      fetchData()
    } catch (err: any) {
      setLayerFormError(err.message)
    } finally {
      setIsLayerSubmitting(false)
    }
  }

  const handleDeleteLayer = async (id: number) => {
    if (!confirm(t('layers.errors.confirmDeleteLayer'))) {
      return
    }

    try {
      const response = await api.delete(`/layers/${id}`)

      if (!response.ok) {
        throw new Error(t('layers.errors.failedToDelete'))
      }

      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleToggleLayerActive = async (layer: Layer) => {
    try {
      const response = await api.put(`/layers/${layer.id}`, {
        is_active: !layer.is_active
      })

      if (!response.ok) {
        throw new Error(t('layers.errors.failedToUpdate'))
      }

      fetchData()
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
        legend: group.legend || [],
        sort_order: group.sort_order
      })
    } else {
      setEditingGroup(null)
      setGroupFormData({
        name: '',
        parent_id: '',
        description: '',
        legend: [],
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

    try {
      const response = editingGroup
        ? await api.put(`/groups/${editingGroup.id}`, {
            name: groupFormData.name,
            parent_id: groupFormData.parent_id ? parseInt(groupFormData.parent_id) : null,
            description: groupFormData.description || null,
            legend: groupFormData.legend.length > 0 ? groupFormData.legend : null,
            sort_order: groupFormData.sort_order
          })
        : await api.post('/groups', {
            name: groupFormData.name,
            parent_id: groupFormData.parent_id ? parseInt(groupFormData.parent_id) : null,
            description: groupFormData.description || null,
            legend: groupFormData.legend.length > 0 ? groupFormData.legend : null,
            sort_order: groupFormData.sort_order
          })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('layers.errors.failedToSave'))
      }

      handleCloseGroupModal()
      fetchData()
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
      ? t('layers.errors.confirmDeleteGroupWithChildren')
      : t('layers.errors.confirmDeleteGroup')
    
    if (!confirm(message)) {
      return
    }

    try {
      const response = await api.delete(`/groups/${id}`)

      if (!response.ok) {
        throw new Error(t('layers.errors.failedToDelete'))
      }

      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
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

    // Sort children by sort_order within each group
    const sortChildren = (groupList: any[]) => {
      groupList.forEach(group => {
        if (group.children?.length > 0) {
          group.children.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          sortChildren(group.children)
        }
      })
    }
    sortChildren(rootGroups)

    // Sort root groups by sort_order
    rootGroups.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))

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
                <span>{t('layers.groupTab.layersCount', { count: group.layer_count || 0 })}</span>
                <span>{t('layers.groupTab.subgroupsCount', { count: group.child_count || 0 })}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenGroupModal(group)}
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              {t('shared.edit')}
            </button>
            <button
              onClick={() => handleDeleteGroup(group.id)}
              className="text-red-600 hover:text-red-800 font-medium text-sm"
            >
              {t('shared.delete')}
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
          <p className="mt-4 text-gray-600">{t('shared.loading')}</p>
        </div>
      </div>
    )
  }

  const configuredForStats = layers.filter(l => l.file_path && l.class_labels).length
  const activeLayers = layers.filter(l => l.is_active).length
  const ungroupedLayers = layers.filter(l => !l.group_id).length

  // Get all groups for layer dropdown (flatten with full path)
  const getFlatGroupOptions = () => {
    const options: { id: number; name: string; path: string }[] = []
    const addGroup = (groupList: any[], parentPath = '') => {
      groupList.forEach(g => {
        const currentPath = parentPath ? `${parentPath} → ${g.name}` : g.name
        options.push({ id: g.id, name: g.name, path: currentPath })
        if (g.children?.length > 0) {
          addGroup(g.children, currentPath)
        }
      })
    }
    addGroup(buildGroupTree())
    return options
  }

  // Get parent group options with full path (for group modal)
  const getParentGroupOptionsWithPath = (excludeId?: number) => {
    return getFlatGroupOptions().filter(g => g.id !== excludeId)
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
              <h1 className="text-2xl font-bold text-gray-900">{t('layers.title')}</h1>
              <p className="text-gray-600 mt-1">{t('layers.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/clips"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
              {t('dashboard.clipManagement')}
            </Link>
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
                  {t('layers.syncing')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('layers.syncFromGeoServer')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">{t('layers.syncComplete')}</span>
              <span>{t('layers.syncResult', { added: syncResult.added, updated: syncResult.updated, total: syncResult.total })}</span>
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
            <p className="text-gray-600 text-sm">{t('layers.stats.totalLayers')}</p>
            <p className="text-3xl font-bold text-gray-900">{layers.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">{t('layers.stats.activeLayers')}</p>
            <p className="text-3xl font-bold text-green-600">{activeLayers}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">{t('layers.stats.groups')}</p>
            <p className="text-3xl font-bold text-blue-600">{groups.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">{t('layers.stats.statsReady')}</p>
            <p className="text-3xl font-bold text-purple-600">{configuredForStats}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">{t('layers.stats.ungrouped')}</p>
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
            {t('layers.tabs.layers')} ({layers.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-6 py-3 text-sm font-semibold transition ${
              activeTab === 'groups'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('layers.tabs.groups')} ({groups.length})
          </button>
        </div>

        {/* Layers Tab */}
        {activeTab === 'layers' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">{t('layers.layerTab.allLayers')}</h2>
              <button
                onClick={() => handleOpenLayerModal()}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm"
              >
                {t('layers.layerTab.addLayer')}
              </button>
            </div>

            {layers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">{t('layers.layerTab.noLayersFound')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('layers.layerTab.clickSyncToFetch')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('layers.layerTab.table.layer')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('layers.layerTab.table.group')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('layers.layerTab.table.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('layers.layerTab.table.statsReady')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('layers.layerTab.table.actions')}
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
                            <span className="text-gray-400 text-sm">{t('layers.layerTab.ungrouped')}</span>
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
                            {layer.is_active ? t('layers.layerTab.active') : t('layers.layerTab.inactive')}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {layer.file_path && layer.class_labels ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {t('layers.layerTab.ready')}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-sm">{t('layers.layerTab.needsConfig')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleOpenLayerModal(layer)}
                            className="text-gray-900 hover:text-gray-700 mr-4 font-medium"
                          >
                            {t('shared.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteLayer(layer.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            {t('shared.delete')}
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
              <h2 className="text-lg font-semibold text-gray-900">{t('layers.groupTab.layerGroupsNested')}</h2>
              <button
                onClick={() => handleOpenGroupModal()}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm"
              >
                {t('layers.groupTab.addGroup')}
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-600">{t('layers.groupTab.noGroupsCreated')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('layers.groupTab.createGroupsToOrganize')}</p>
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
                {editingLayer ? t('layers.layerModal.editLayer') : t('layers.layerModal.addLayer')}
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
                  {t('layers.layerModal.geoserverLayerName')}
                </label>
                <input
                  type="text"
                  value={layerFormData.geoserver_name}
                  onChange={(e) => setLayerFormData({ ...layerFormData, geoserver_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder={t('layers.layerModal.geoserverLayerNamePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('layers.layerModal.displayName')}
                </label>
                <input
                  type="text"
                  value={layerFormData.display_name}
                  onChange={(e) => setLayerFormData({ ...layerFormData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder={t('layers.layerModal.displayNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('layers.layerModal.group')}
                </label>
                <select
                  value={layerFormData.group_id}
                  onChange={(e) => setLayerFormData({ ...layerFormData, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">{t('layers.layerModal.noGroupUngrouped')}</option>
                  {getFlatGroupOptions().map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.path}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('layers.layerModal.filePath')}
                </label>
                <input
                  type="text"
                  value={layerFormData.file_path}
                  onChange={(e) => setLayerFormData({ ...layerFormData, file_path: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder={t('layers.layerModal.filePathPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('layers.layerModal.classLabels')}
                </label>
                <textarea
                  value={layerFormData.class_labels}
                  onChange={(e) => setLayerFormData({ ...layerFormData, class_labels: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
                  rows={10}
                />
              </div>

              {/* Legend Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('layers.layerModal.legend')}
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">{t('shared.classColor')}</span>
                    <button
                      type="button"
                      onClick={() => setLayerFormData({
                        ...layerFormData,
                        legend: [...layerFormData.legend, { class: { en: '', fr: '' }, color: '#000000' }]
                      })}
                      className="text-sm text-gray-900 hover:text-gray-600 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {t('shared.addClass')}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {layerFormData.legend.length === 0 ? (
                      <div className="px-3 py-6 text-center text-gray-400 text-sm">
                        {t('layers.layerModal.noLegendItems')}
                      </div>
                    ) : (
                      layerFormData.legend.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1 flex gap-1">
                            <input
                              type="text"
                              value={typeof item.class === 'object' ? (item.class as {en:string,fr:string}).en : item.class}
                              onChange={(e) => {
                                const newLegend = [...layerFormData.legend]
                                const current = typeof item.class === 'object' ? { ...(item.class as {en:string,fr:string}) } : { en: item.class, fr: item.class }
                                newLegend[index] = { ...newLegend[index], class: { ...current, en: e.target.value } }
                                setLayerFormData({ ...layerFormData, legend: newLegend })
                              }}
                              placeholder="EN"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-900 focus:border-transparent"
                            />
                            <input
                              type="text"
                              value={typeof item.class === 'object' ? (item.class as {en:string,fr:string}).fr : item.class}
                              onChange={(e) => {
                                const newLegend = [...layerFormData.legend]
                                const current = typeof item.class === 'object' ? { ...(item.class as {en:string,fr:string}) } : { en: item.class, fr: item.class }
                                newLegend[index] = { ...newLegend[index], class: { ...current, fr: e.target.value } }
                                setLayerFormData({ ...layerFormData, legend: newLegend })
                              }}
                              placeholder="FR"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-900 focus:border-transparent"
                            />
                          </div>
                          <input
                            type="color"
                            value={item.color}
                            onChange={(e) => {
                              const newLegend = [...layerFormData.legend]
                              newLegend[index] = { ...newLegend[index], color: e.target.value }
                              setLayerFormData({ ...layerFormData, legend: newLegend })
                            }}
                            className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newLegend = layerFormData.legend.filter((_, i) => i !== index)
                              setLayerFormData({ ...layerFormData, legend: newLegend })
                            }}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                    {t('layers.layerModal.activeOnMap')}
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shared.sortOrder')}
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
                  {t('shared.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isLayerSubmitting}
                  className={`px-4 py-2 bg-gray-900 text-white rounded-lg transition font-medium ${
                    isLayerSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                  }`}
                >
                  {isLayerSubmitting ? t('shared.saving') : (editingLayer ? t('shared.update') : t('shared.create'))}
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
                {editingGroup ? t('layers.groupModal.editGroup') : t('layers.groupModal.addGroup')}
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
                  {t('layers.groupModal.groupName')}
                </label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder={t('layers.groupModal.groupNamePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('layers.groupModal.parentGroup')}
                </label>
                <select
                  value={groupFormData.parent_id}
                  onChange={(e) => setGroupFormData({ ...groupFormData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">{t('layers.groupModal.noParentRootGroup')}</option>
                  {getParentGroupOptionsWithPath(editingGroup?.id).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.path}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('layers.groupModal.selectParentHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('layers.groupModal.description')}
                </label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder={t('layers.groupModal.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              {/* Legend Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('layers.groupModal.legend')}
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">{t('shared.classColor')}</span>
                    <button
                      type="button"
                      onClick={() => setGroupFormData({
                        ...groupFormData,
                        legend: [...groupFormData.legend, { class: { en: '', fr: '' }, color: '#000000' }]
                      })}
                      className="text-sm text-gray-900 hover:text-gray-600 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {t('shared.addClass')}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {groupFormData.legend.length === 0 ? (
                      <div className="px-3 py-6 text-center text-gray-400 text-sm">
                        {t('layers.groupModal.noLegendItems')}
                      </div>
                    ) : (
                      groupFormData.legend.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1 flex gap-1">
                            <input
                              type="text"
                              value={typeof item.class === 'object' ? (item.class as {en:string,fr:string}).en : item.class}
                              onChange={(e) => {
                                const newLegend = [...groupFormData.legend]
                                const current = typeof item.class === 'object' ? { ...(item.class as {en:string,fr:string}) } : { en: item.class, fr: item.class }
                                newLegend[index] = { ...newLegend[index], class: { ...current, en: e.target.value } }
                                setGroupFormData({ ...groupFormData, legend: newLegend })
                              }}
                              placeholder="EN"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-900 focus:border-transparent"
                            />
                            <input
                              type="text"
                              value={typeof item.class === 'object' ? (item.class as {en:string,fr:string}).fr : item.class}
                              onChange={(e) => {
                                const newLegend = [...groupFormData.legend]
                                const current = typeof item.class === 'object' ? { ...(item.class as {en:string,fr:string}) } : { en: item.class, fr: item.class }
                                newLegend[index] = { ...newLegend[index], class: { ...current, fr: e.target.value } }
                                setGroupFormData({ ...groupFormData, legend: newLegend })
                              }}
                              placeholder="FR"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-900 focus:border-transparent"
                            />
                          </div>
                          <input
                            type="color"
                            value={item.color}
                            onChange={(e) => {
                              const newLegend = [...groupFormData.legend]
                              newLegend[index] = { ...newLegend[index], color: e.target.value }
                              setGroupFormData({ ...groupFormData, legend: newLegend })
                            }}
                            className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newLegend = groupFormData.legend.filter((_, i) => i !== index)
                              setGroupFormData({ ...groupFormData, legend: newLegend })
                            }}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('layers.groupModal.legendHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('shared.sortOrder')}
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
                  {t('shared.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isGroupSubmitting}
                  className={`px-4 py-2 bg-gray-900 text-white rounded-lg transition font-medium ${
                    isGroupSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                  }`}
                >
                  {isGroupSubmitting ? t('shared.saving') : (editingGroup ? t('shared.update') : t('shared.create'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
