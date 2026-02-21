'use client'

interface ReportingOverlayProps {
  reportingMode: boolean
  reportingStep: 'draw' | 'comment'
  reportComment: string
  isSubmittingReport: boolean
  reportMessage: string
  onSubmitReport: () => void
  onCancelReport: () => void
  onReportCommentChange: (comment: string) => void
}

export default function ReportingOverlay({
  reportingMode,
  reportingStep,
  reportComment,
  isSubmittingReport,
  reportMessage,
  onSubmitReport,
  onCancelReport,
  onReportCommentChange,
}: ReportingOverlayProps) {
  if (!reportingMode) return null

  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-50 border-2 border-red-300">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <h3 className="text-sm font-bold text-gray-900">Report Invalid Data</h3>
      </div>

      {reportingStep === 'draw' && (
        <div>
          <div className="text-sm text-gray-600 mb-3">
            Draw a polygon around the area with invalid data.
          </div>
          <button
            onClick={onCancelReport}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {reportingStep === 'comment' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment
            </label>
            <textarea
              value={reportComment}
              onChange={(e) => onReportCommentChange(e.target.value)}
              placeholder="Describe the issue (e.g., 'Blue should be water, not sand')"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onSubmitReport}
              disabled={isSubmittingReport}
              className={`flex-1 px-4 py-2 bg-red-600 text-white rounded-lg transition font-medium text-sm ${
                isSubmittingReport ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
              }`}
            >
              {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
            <button
              onClick={onCancelReport}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
            >
              Cancel
            </button>
          </div>

          {reportMessage && (
            <div className={`text-xs p-2 rounded ${
              reportMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {reportMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
