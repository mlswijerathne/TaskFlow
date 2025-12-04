import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET: Process and return pending reminders
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Find notifications that need to be sent
    const now = new Date().toISOString();
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'reminder')
      .eq('read', false)
      .lte('send_at', now)
      .limit(100);

    if (fetchError) {
      console.error('Failed to fetch notifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No pending reminders', processed: 0 });
    }

    const results = {
      processed: 0,
      errors: [] as string[],
    };

    // Process each notification
    for (const notification of notifications) {
      try {
        // Mark notification as read/sent
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            read: true,
            payload: {
              ...notification.payload,
              sent_at: new Date().toISOString(),
            },
          })
          .eq('id', notification.id);

        if (updateError) {
          results.errors.push(`Failed to update notification ${notification.id}`);
        } else {
          results.processed++;
        }
      } catch (err) {
        results.errors.push(
          `Error processing ${notification.id}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} reminders`,
      ...results,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Manually create a reminder notification
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerClient();

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { card_id, send_at } = body;

    if (!card_id) {
      return NextResponse.json(
        { error: 'Missing required field: card_id' },
        { status: 400 }
      );
    }

    // Get the card
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Create the notification
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        card_id: card.id,
        type: 'reminder',
        payload: {
          card_title: card.title,
          board_id: card.board_id,
          due_date: card.due_date,
        },
        send_at: send_at || card.due_date,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create reminder', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: notification }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
