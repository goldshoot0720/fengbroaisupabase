// Netlify Blobs 代理函數
import { getStore } from '@netlify/blobs'

export default async (request) => {
  const url = new URL(request.url)
  const apiPrefix = '/api/blobs/'
  const path = url.pathname
  if (!path.startsWith(apiPrefix)) {
    return new Response('Invalid path', { status: 400 })
  }

  const rawKey = path.slice(apiPrefix.length)
  let storeName = 'videos'
  let blobKey = rawKey

  if (rawKey.startsWith('music/')) {
    storeName = 'music'
    blobKey = rawKey.slice('music/'.length)
  }
  
  console.log('Blob proxy request:', { 
    method: request.method,
    pathname: url.pathname, 
    blobKey, 
    timestamp: new Date().toISOString() 
  })
  
  try {
    if (!blobKey || blobKey.trim() === '') {
      console.error('Invalid blob key:', blobKey)
      return new Response('Invalid blob key', { status: 400 })
    }
    
    const store = getStore(storeName)
    
    console.log('Fetching blob as stream:', blobKey)
    const blob = await store.get(blobKey, { type: 'stream' })
    
    if (!blob) {
      console.error('Blob not found:', blobKey)
      return new Response('Video not found', { status: 404 })
    }
    
    console.log('Blob stream found!')
    
    let contentLength = null
    try {
      const metadata = await store.getMetadata(blobKey)
      if (metadata && metadata.fileSize) {
        contentLength = metadata.fileSize.toString()
        console.log('Content-Length from metadata:', contentLength)
      }
    } catch (metaError) {
      console.log('Could not get metadata:', metaError.message)
    }
    
    let contentType = 'application/octet-stream'
    const lowerKey = blobKey.toLowerCase()
    if (lowerKey.endsWith('.mp4')) {
      contentType = 'video/mp4'
    } else if (lowerKey.endsWith('.mp3')) {
      contentType = 'audio/mpeg'
    } else if (lowerKey.endsWith('.m4a')) {
      contentType = 'audio/mp4'
    } else if (lowerKey.endsWith('.wav')) {
      contentType = 'audio/wav'
    }

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes'
    }
    
    if (contentLength) {
      headers['Content-Length'] = contentLength
    }
    
    console.log('Returning blob stream with headers:', headers)
    
    return new Response(blob, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Blob proxy error:', error)
    return new Response(`Internal server error: ${error.message}`, { status: 500 })
  }
}
