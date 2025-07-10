import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET - Fetch spouse profile for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('spouse_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update spouse profile
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, nickname, display_nickname, photo_url, birthday, anniversary, notes } = body

    console.log('Creating/updating profile for user:', user.id, 'with data:', body)

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('spouse_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    let result
    if (existingProfile) {
      // Update existing profile
      console.log('Updating existing profile:', existingProfile.id)
      const { data, error } = await supabase
        .from('spouse_profiles')
        .update({ name, nickname, display_nickname, photo_url, birthday, anniversary, notes })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    } else {
      // Create new profile using raw SQL to bypass RLS
      console.log('Creating new profile for user:', user.id)
      
      // Clean the data to avoid empty string issues
      const cleanData = {
        user_id: user.id,
        name: name || '',
        nickname: nickname || null,
        display_nickname: typeof display_nickname === 'boolean' ? display_nickname : false,
        photo_url: photo_url || null,
        birthday: birthday || null,
        anniversary: anniversary || null,
        notes: notes || null
      }
      
      // Remove undefined values
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key as keyof typeof cleanData] === undefined) {
          delete cleanData[key as keyof typeof cleanData]
        }
      })
      
      console.log('Clean data for insert:', cleanData)
      
      // Direct insert (RLS should be disabled for testing)
      const { data, error } = await supabase
        .from('spouse_profiles')
        .insert(cleanData)
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    }

    console.log('Profile operation successful:', result)
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Unexpected error in POST /api/spouse-profiles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 