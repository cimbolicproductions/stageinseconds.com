import sql from '@/app/api/utils/sql'

export async function POST(request) {
  try {
    const body = await request.json()
    const { agentId, agentName, agentPhone, prompt, photoName } = body

    // Validate input
    if (!agentId || !agentName || !agentPhone || !prompt || !photoName) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // In a real implementation, this would:
    // 1. Upload the demo photo to cloud storage
    // 2. Call Google's Nano Banana API to enhance the photo
    // 3. Store the enhanced photo
    // 4. Create a public link to the enhanced photo
    // 5. Send SMS via HighLevel CRM API
    // 6. Create a record in the database

    // Simulate the process
    console.log(`Processing demo for agent: ${agentName} (${agentPhone})`)
    console.log(`Photo: ${photoName}, Prompt: ${prompt}`)

    // Create a demo job record
    const demoJobResult = await sql`
      INSERT INTO photo_jobs (prompt, photo_count, cost, status, download_url)
      VALUES (${`Demo for ${agentName}: ${prompt}`}, 1, 0.00, 'completed', ${`https://demo.stageinseconds.com/agent-${agentId}-demo.jpg`})
      RETURNING id, download_url
    `

    const demoJob = demoJobResult[0]

    // Simulate HighLevel CRM SMS integration
    await sendSMSViaHighLevel(agentPhone, agentName, demoJob.download_url)

    // Log the demo send for tracking
    console.log(`Demo sent to ${agentName} at ${agentPhone}`)
    console.log(`Enhanced photo URL: ${demoJob.download_url}`)

    return Response.json({
      success: true,
      message: `Demo sent successfully to ${agentName}`,
      demoJobId: demoJob.id,
      enhancedPhotoUrl: demoJob.download_url,
      agentPhone: agentPhone,
    })
  } catch (error) {
    console.error('Send demo error:', error)
    return Response.json(
      {
        error: 'Failed to send demo',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// Simulate HighLevel CRM SMS sending
async function sendSMSViaHighLevel(phone, agentName, photoUrl) {
  const HIGHLEVEL_API_KEY = process.env.HIGHLEVEL_API_KEY
  const HIGHLEVEL_LOCATION_ID = process.env.HIGHLEVEL_LOCATION_ID

  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    console.log('Demo mode: HighLevel credentials not set')
    // Simulate the SMS for demo purposes
    console.log(`SMS would be sent to ${phone}:`)
    console.log(
      `Hi ${agentName}! Check out how StageInSeconds enhanced this listing photo: ${photoUrl} - Get 6-10% faster sales with staged-quality photos. Reply to learn more!`
    )
    return Promise.resolve()
  }

  try {
    const smsMessage = `Hi ${agentName}! 🏠 Check out how StageInSeconds enhanced this listing photo: ${photoUrl} - Get 6-10% faster sales with staged-quality photos. Reply to learn more!`

    const response = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HIGHLEVEL_API_KEY}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
        body: JSON.stringify({
          type: 'SMS',
          contactId: `agent-${Date.now()}`,
          locationId: HIGHLEVEL_LOCATION_ID,
          message: smsMessage,
          direction: 'outbound',
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`HighLevel API error: ${response.status}`)
    }

    const result = await response.json()
    console.log('SMS sent successfully via HighLevel:', result)
    return result
  } catch (error) {
    console.error('HighLevel SMS error:', error)
    throw error
  }
}
