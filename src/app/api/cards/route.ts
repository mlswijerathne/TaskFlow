import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const CARD_LIMIT = 100;

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Create Supabase client
    const supabase = createServerClient();

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Parse request body
    const body = await request.json();
    const { title, description, column_id, board_id, due_date, position, assignee } = body;

    // Validate required fields
    if (!title || !column_id || !board_id) {
      return NextResponse.json(
        { error: 'Missing required fields: title, column_id, board_id' },
        { status: 400 }
      );
    }

    // Rate limit check: count cards created by this user
    const { count, error: countError } = await supabase
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json(
        { error: 'Failed to check card limit' },
        { status: 500 }
      );
    }

    if (count !== null && count >= CARD_LIMIT) {
      return NextResponse.json(
        {
          error: 'Card limit reached',
          message: `You have reached the maximum limit of ${CARD_LIMIT} cards.`,
          current_count: count,
          limit: CARD_LIMIT,
        },
        { status: 429 }
      );
    }

    // Verify the board exists
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, owner')
      .eq('id', board_id)
      .single();

    if (boardError || !board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      );
    }

    // Verify the column exists and belongs to the board
    const { data: column, error: columnError } = await supabase
      .from('columns')
      .select('id')
      .eq('id', column_id)
      .eq('board_id', board_id)
      .single();

    if (columnError || !column) {
      return NextResponse.json(
        { error: 'Column not found or does not belong to this board' },
        { status: 404 }
      );
    }

    // Calculate position if not provided
    let cardPosition = position;
    if (cardPosition === undefined || cardPosition === null) {
      const { data: maxPosData } = await supabase
        .from('cards')
        .select('position')
        .eq('column_id', column_id)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const posData = maxPosData as { position: number } | null;
      cardPosition = posData ? posData.position + 1 : 0;
    }

    // Insert the card
    const { data: card, error: insertError } = await supabase
      .from('cards')
      .insert({
        title,
        description: description || null,
        column_id,
        board_id,
        due_date: due_date || null,
        position: cardPosition,
        created_by: userId,
        assignee: assignee || null,
        metadata: {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create card', details: insertError.message },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: card,
        cards_created: (count || 0) + 1,
        cards_remaining: CARD_LIMIT - (count || 0) - 1,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
