// Example usage of enterprise features in your TaskFlow app

import { 
  shareBoard,
  generateMonthlyReport,
  bulkCreateCards,
  bulkMoveCards,
  bulkDeleteCards,
  syncData 
} from '@/lib/edgeFunctions';

// ===================================================================
// 1. SHARE BOARD WITH CLIENT
// ===================================================================
export async function shareWithClient(boardId: string) {
  try {
    // Generate a view-only link that expires in 7 days
    const result = await shareBoard(boardId, 'view', 168); // 7 * 24 hours
    
    if (result.success && result.data) {
      const shareUrl = result.data.share_url;
      
      // Send via email, Slack, etc.
      console.log('Share this URL with your client:', shareUrl);
      console.log('Expires:', result.data.expires_at);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert('Share URL copied to clipboard!');
      
      return shareUrl;
    }
  } catch (error) {
    console.error('Failed to share board:', error);
    alert('Failed to generate share URL');
  }
}

// ===================================================================
// 2. GENERATE MONTHLY TEAM REPORT
// ===================================================================
export async function generateTeamReport(boardIds: string[]) {
  try {
    // Generate comprehensive report for all team boards
    const result = await generateMonthlyReport(
      boardIds,
      2025,
      12  // December
    );
    
    if (result.success && result.data) {
      const report = result.data;
      
      console.log('📊 Monthly Report:');
      console.log('Total Cards:', report.summary.total_cards);
      console.log('Completed:', report.summary.completed_cards);
      console.log('Completion Rate:', report.summary.completion_rate);
      
      // Display metrics
      console.log('\nCards by Column:');
      report.summary.cards_by_column.forEach((col: any) => {
        console.log(`  ${col.title}: ${col.count} cards`);
      });
      
      console.log('\nTop Contributors:');
      report.data.member_performance.forEach((member: any) => {
        console.log(`  ${member.display_name}: ${member.cards_created} cards`);
      });
      
      // Download as CSV if needed
      if (report.csv_data) {
        downloadCSV(report.csv_data, 'team-report-dec-2025.csv');
      }
      
      return report;
    }
  } catch (error) {
    console.error('Failed to generate report:', error);
  }
}

// ===================================================================
// 3. BULK IMPORT TASKS FROM SPREADSHEET
// ===================================================================
export async function importTasksFromCSV(
  boardId: string,
  columnId: string,
  csvFile: File
) {
  try {
    // Parse CSV file
    const text = await csvFile.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    // Convert to card objects
    const cards = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',');
        return {
          title: values[0]?.trim() || 'Untitled',
          description: values[1]?.trim() || '',
          priority: (values[2]?.trim().toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
        };
      });
    
    console.log(`Importing ${cards.length} tasks...`);
    
    // Bulk create cards
    const result = await bulkCreateCards(boardId, columnId, cards);
    
    if (result.success) {
      console.log(`✅ Successfully imported ${result.data?.successful} cards`);
      
      if (result.data?.failed && result.data.failed.length > 0) {
        console.warn(`⚠️ Failed to import ${result.data.failed.length} cards`);
        result.data.failed.forEach((f: any) => {
          console.error(`  - ${f.error}`);
        });
      }
      
      alert(`Imported ${result.data?.successful} tasks successfully!`);
      return result.data;
    }
  } catch (error) {
    console.error('Failed to import tasks:', error);
    alert('Failed to import tasks from CSV');
  }
}

// ===================================================================
// 4. SPRINT CLEANUP - MOVE COMPLETED TASKS
// ===================================================================
export async function moveCompletedToDone(
  boardId: string,
  doneColumnId: string,
  completedCardIds: string[]
) {
  try {
    console.log(`Moving ${completedCardIds.length} completed tasks...`);
    
    const result = await bulkMoveCards(
      boardId,
      completedCardIds,
      doneColumnId
    );
    
    if (result.success) {
      console.log(`✅ Moved ${result.data?.successful} cards to Done`);
      alert('Sprint cleanup completed!');
      return result.data;
    }
  } catch (error) {
    console.error('Failed to move cards:', error);
  }
}

// ===================================================================
// 5. ARCHIVE OLD CARDS
// ===================================================================
export async function archiveOldCards(
  boardId: string,
  oldCardIds: string[]
) {
  try {
    // Confirm before deleting
    const confirmed = confirm(
      `Are you sure you want to archive ${oldCardIds.length} old cards?`
    );
    
    if (!confirmed) return;
    
    console.log(`Archiving ${oldCardIds.length} cards...`);
    
    const result = await bulkDeleteCards(boardId, oldCardIds);
    
    if (result.success) {
      console.log(`✅ Archived ${result.data?.successful} cards`);
      alert('Old cards archived successfully!');
      return result.data;
    }
  } catch (error) {
    console.error('Failed to archive cards:', error);
  }
}

// ===================================================================
// 6. SYNC WITH JIRA
// ===================================================================
export async function syncWithJira(
  boardId: string,
  todoColumnId: string,
  inProgressColumnId: string,
  doneColumnId: string
) {
  try {
    console.log('Starting Jira sync...');
    
    const result = await syncData(
      boardId,
      'jira',
      'bidirectional',
      {
        field_mappings: {
          title: 'summary',
          description: 'description',
        },
        status_mappings: {
          'To Do': todoColumnId,
          'In Progress': inProgressColumnId,
          'Done': doneColumnId,
        },
      }
    );
    
    if (result.success && result.data) {
      console.log('✅ Jira sync completed!');
      console.log('Imported:', result.data.imported_count);
      console.log('Exported:', result.data.exported_count);
      console.log('Updated:', result.data.updated_count);
      
      if (result.data.conflicts && result.data.conflicts.length > 0) {
        console.warn('⚠️ Conflicts detected:', result.data.conflicts);
      }
      
      alert('Jira sync completed successfully!');
      return result.data;
    }
  } catch (error) {
    console.error('Failed to sync with Jira:', error);
    alert('Jira sync failed');
  }
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function downloadCSV(csvData: string, filename: string) {
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ===================================================================
// REACT COMPONENT EXAMPLE
// ===================================================================

/*
import { ShareBoardButton, GenerateReportButton, BulkOperations } from '@/components/enterprise';

export function BoardToolbar({ boardId, boardTitle, columnId }: Props) {
  return (
    <div className="flex items-center gap-2">
      <ShareBoardButton 
        boardId={boardId} 
        boardTitle={boardTitle}
      />
      
      <GenerateReportButton 
        boardIds={[boardId]}
      />
      
      <BulkOperations 
        boardId={boardId}
        columnId={columnId}
      />
    </div>
  );
}
*/

// ===================================================================
// USAGE IN PAGES
// ===================================================================

/*
// app/boards/[id]/page.tsx
import { ShareBoardButton, GenerateReportButton, BulkOperations } from '@/components/enterprise';

export default function BoardPage() {
  return (
    <div>
      <header>
        <h1>Board Title</h1>
        
        <div className="flex gap-2">
          <ShareBoardButton boardId={boardId} boardTitle="Sprint Board" />
          <GenerateReportButton boardIds={[boardId]} />
          <BulkOperations boardId={boardId} columnId={defaultColumnId} />
        </div>
      </header>
      
      {/* Board content */}
    </div>
  );
}
*/
