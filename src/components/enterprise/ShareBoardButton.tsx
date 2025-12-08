'use client';

import { useState } from 'react';
import { generateShareUrl, ShareUrlResponse } from '@/lib/edgeFunctions';
import { toast } from 'react-hot-toast';

interface ShareBoardButtonProps {
  boardId: string;
  boardTitle: string;
}

export function ShareBoardButton({ boardId, boardTitle }: ShareBoardButtonProps) {
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<ShareUrlResponse['data'] | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleShare = async (accessLevel: 'view' | 'edit', hours: number) => {
    setLoading(true);
    try {
      const result = await generateShareUrl(boardId, accessLevel, hours);
      
      if (result.success) {
        setShareData(result.data);
        setShowModal(true);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(result.data.share_url);
        toast.success('Share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to generate share URL:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => handleShare('view', 24)}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Share (View Only)'}
        </button>
        
        <button
          onClick={() => handleShare('edit', 24)}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Share (Can Edit)'}
        </button>
      </div>

      {showModal && shareData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Board Shared Successfully!</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Board:</label>
                <p className="text-gray-900">{boardTitle}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Access Level:</label>
                <p className="text-gray-900 capitalize">{shareData.access_level}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Expires:</label>
                <p className="text-gray-900">
                  {new Date(shareData.expires_at).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Share Link:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareData.share_url}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareData.share_url);
                      toast.success('Copied!');
                    }}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
