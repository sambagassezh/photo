import "@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image } = await req.json()
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY")

    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing GOOGLE_API_KEY" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    // Call Google Cloud Vision API
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: image
            },
            features: [
              {
                type: "SAFE_SEARCH_DETECTION"
              }
            ]
          }
        ]
      })
    })

    const data = await response.json()
    
    if (!data.responses || !data.responses[0].safeSearchAnnotation) {
        return new Response(
            JSON.stringify({ safe: true, message: "No safety data available" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    const safety = data.responses[0].safeSearchAnnotation
    
    // Likelihood levels: UNKNOWN, VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY
    const unsafeLevels = ["LIKELY", "VERY_LIKELY"]

    const isUnsafe = 
        unsafeLevels.includes(safety.adult) ||
        unsafeLevels.includes(safety.violence) ||
        unsafeLevels.includes(safety.racy)

    return new Response(
      JSON.stringify({ safe: !isUnsafe, result: safety }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    )
  }
})
