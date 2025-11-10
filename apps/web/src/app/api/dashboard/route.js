import sql from '@/app/api/utils/sql'
import { auth } from '@/auth'

export async function GET(request) {
  try {
    const session = await auth()
    const userId = session?.user?.id || null
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch recent jobs (last 50) for this user only
    const jobs = await sql`
      SELECT 
        id,
        prompt,
        photo_count,
        cost,
        status,
        download_url,
        created_at,
        updated_at,
        group_name -- ADD: include optional user-defined group label
      FROM photo_jobs 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC 
      LIMIT 50
    `

    // Calculate user-specific statistics
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_jobs,
        COALESCE(SUM(photo_count), 0) as total_photos,
        COALESCE(SUM(cost), 0) as total_spent,
        COALESCE(SUM(CASE 
          WHEN created_at >= date_trunc('month', CURRENT_DATE) 
          THEN cost 
          ELSE 0 
        END), 0) as this_month_spent
      FROM photo_jobs
      WHERE user_id = ${userId}
    `

    const stats = statsResult[0]

    // Format jobs data for frontend
    const formattedJobs = jobs.map(job => ({
      id: job.id,
      prompt: job.prompt,
      photoCount: job.photo_count,
      cost: parseFloat(job.cost),
      status: job.status,
      downloadUrl: job.download_url,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      groupName: job.group_name || null, // ADD: expose optional group name
    }))

    // Format stats data for frontend
    const formattedStats = {
      totalJobs: parseInt(stats.total_jobs),
      totalPhotos: parseInt(stats.total_photos),
      totalSpent: parseFloat(stats.total_spent),
      thisMonth: parseFloat(stats.this_month_spent),
    }

    return Response.json({
      success: true,
      jobs: formattedJobs,
      stats: formattedStats,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return Response.json(
      {
        error: 'Failed to load dashboard data',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// GET individual job by ID (kept for reference, not used by page)
export async function GET_JOB(request, { params }) {
  try {
    const { id } = params

    if (!id || isNaN(parseInt(id))) {
      return Response.json(
        { error: 'Valid job ID is required' },
        { status: 400 }
      )
    }

    const jobResult = await sql`
      SELECT 
        id,
        prompt,
        photo_count,
        cost,
        status,
        download_url,
        created_at,
        updated_at,
        group_name -- ADD
      FROM photo_jobs 
      WHERE id = ${parseInt(id)}
    `

    if (jobResult.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    const job = jobResult[0]

    return Response.json({
      success: true,
      job: {
        id: job.id,
        prompt: job.prompt,
        photoCount: job.photo_count,
        cost: parseFloat(job.cost),
        status: job.status,
        downloadUrl: job.download_url,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        groupName: job.group_name || null, // ADD
      },
    })
  } catch (error) {
    console.error('Get job error:', error)
    return Response.json(
      {
        error: 'Failed to load job data',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
