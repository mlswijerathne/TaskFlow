'use client';

import { useState } from 'react';
import { generateReport, ReportResponse } from '@/lib/edgeFunctions';
import { toast } from 'react-hot-toast';

interface GenerateReportButtonProps {
  boardIds: string[];
}

export function GenerateReportButton({ boardIds }: GenerateReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleGenerateReport = async (
    reportType: 'summary' | 'detailed' | 'performance',
    format: 'json' | 'csv' = 'json'
  ) => {
    setLoading(true);
    try {
      // Last 30 days
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const result = await generateReport(
        boardIds,
        reportType,
        { start, end },
        format
      );

      if (format === 'csv') {
        // Download CSV
        const blob = new Blob([result as string], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `board-report-${Date.now()}.csv`;
        a.click();
        toast.success('Report downloaded!');
      } else {
        setReportData(result as ReportResponse);
        setShowModal(true);
        toast.success('Report generated!');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => handleGenerateReport('summary', 'json')}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Summary Report'}
        </button>
        
        <button
          onClick={() => handleGenerateReport('performance', 'json')}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Performance Report'}
        </button>
        
        <button
          onClick={() => handleGenerateReport('detailed', 'csv')}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Download CSV'}
        </button>
      </div>

      {showModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Board Report</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Report Type:</span>{' '}
                  <span className="capitalize">{reportData.report_type}</span>
                </div>
                <div>
                  <span className="font-medium">Generated:</span>{' '}
                  {new Date(reportData.generated_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Date Range:</span>{' '}
                  {reportData.date_range.start} to {reportData.date_range.end}
                </div>
                <div>
                  <span className="font-medium">Boards Analyzed:</span>{' '}
                  {reportData.boards_analyzed}
                </div>
              </div>

              {reportData.reports.map((report) => (
                <div key={report.board_id} className="border rounded-lg p-4">
                  <h4 className="font-bold text-lg mb-3">{report.board_title}</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {report.metrics.total_cards}
                      </div>
                      <div className="text-sm text-gray-600">Total Cards</div>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {report.metrics.completed_cards}
                      </div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    
                    <div className="bg-red-50 p-3 rounded">
                      <div className="text-2xl font-bold text-red-600">
                        {report.metrics.overdue_cards}
                      </div>
                      <div className="text-sm text-gray-600">Overdue</div>
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-2xl font-bold text-purple-600">
                        {report.metrics.avg_completion_time_hours.toFixed(1)}h
                      </div>
                      <div className="text-sm text-gray-600">Avg Time</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="font-semibold mb-2">Cards by Priority:</h5>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(report.metrics.cards_by_priority).map(([priority, count]) => (
                        <span
                          key={priority}
                          className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                        >
                          {priority}: {count}
                        </span>
                      ))}
                    </div>
                  </div>

                  {report.member_performance.length > 0 && (
                    <div>
                      <h5 className="font-semibold mb-2">Team Performance:</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Member</th>
                              <th className="px-3 py-2 text-right">Assigned</th>
                              <th className="px-3 py-2 text-right">Completed</th>
                              <th className="px-3 py-2 text-right">Avg Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.member_performance.map((member) => (
                              <tr key={member.user_id} className="border-t">
                                <td className="px-3 py-2">{member.user_name}</td>
                                <td className="px-3 py-2 text-right">{member.cards_assigned}</td>
                                <td className="px-3 py-2 text-right">{member.cards_completed}</td>
                                <td className="px-3 py-2 text-right">
                                  {member.avg_completion_time_hours.toFixed(1)}h
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
