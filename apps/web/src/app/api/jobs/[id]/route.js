import sql from '@/app/api/utils/sql'
import { auth } from '@/auth'
import { validateGroupName } from '@/utils/validators'

export async function PATCH(request, { params }) {
  try {
    const { id } = params || {}
    const jobId = parseInt(id, 10)
    if (!jobId || Number.isNaN(jobId)) {
      return Response.json(
        { error: 'Valid job ID is required' },
        { status: 400 }
      )
    }

    const session = await auth()
    const userId = session?.user?.id || null
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    let { groupName } = body || {}

    if (groupName != null) {
      try {
        validateGroupName(groupName)
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      groupName = groupName.trim()
      if (groupName.length === 0) {
        groupName = null // treat empty string as clearing the name
      }
    } else {
      // Explicitly allow clearing by sending empty string; but if missing, it's an error for now
      return Response.json({ error: 'groupName is required' }, { status: 400 })
    }

    // Ensure the job belongs to the current user
    const rows =
      await sql`SELECT id, user_id FROM photo_jobs WHERE id = ${jobId} LIMIT 1`
    if (rows.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }
    if (String(rows[0].user_id) !== String(userId)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await sql`
      UPDATE photo_jobs
      SET group_name = ${groupName}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${jobId}
      RETURNING id, prompt, photo_count, cost, status, download_url, created_at, updated_at, group_name
    `

    const j = updated[0]
    return Response.json({
      success: true,
      job: {
        id: j.id,
        prompt: j.prompt,
        photoCount: j.photo_count,
        cost: parseFloat(j.cost),
        status: j.status,
        downloadUrl: j.download_url,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
        groupName: j.group_name || null,
      },
    })
  } catch (error) {
    console.error('Update job group name error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params || {}
    const jobId = parseInt(id, 10)
    if (!jobId || Number.isNaN(jobId)) {
      return Response.json(
        { error: 'Valid job ID is required' },
        { status: 400 }
      )
    }

    const session = await auth()
    const userId = session?.user?.id || null
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Ensure the job belongs to the current user
    const rows =
      await sql`SELECT id, user_id FROM photo_jobs WHERE id = ${jobId} LIMIT 1`
    if (rows.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }
    if (String(rows[0].user_id) !== String(userId)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the job
    await sql`DELETE FROM photo_jobs WHERE id = ${jobId}`

    return Response.json({
      success: true,
      message: 'Job deleted successfully',
    })
  } catch (error) {
    console.error('Delete job error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
