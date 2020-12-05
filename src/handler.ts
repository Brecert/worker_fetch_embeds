import { getMeta, Meta } from './get-meta'

interface EmbedAudio {
  url: string
  type: string
}

interface EmbedContent {
  url: string
  alt: string
  type: string
  width: number
  height: number
}

type EmbedVideo = EmbedContent
type EmbedImage = EmbedContent

interface Embed {
  type: 'website' | 'image' | 'audio' | 'video' | string
  title: string
  site_name: string
  description: string
  url: string
  color: string
  audio: Partial<EmbedAudio>
  video: Partial<EmbedVideo>
  image: Partial<EmbedImage>
}

function embedContent<T extends keyof EmbedContent | string>(
  embed: Partial<Embed>,
  name: 'image' | 'video',
  property: string,
  content: T,
) {
  if (embed[name] == null) {
    embed[name] = {}
  }

  switch (property) {
    // Image
    case `og:${name}`:
    case `og:${name}:url`:
    case `og:${name}:secure_url`:
      embed[name]!.url = embed[name]!.url ?? content
      break

    case `og:${name}:type`:
      embed.image!.type = embed.image!.type ?? content
      break

    case `og:${name}:width`: {
      let width = parseInt(content)
      if (width) {
        embed[name]!.width = width
      }
      break
    }

    case `og:${name}:height`: {
      let height = parseInt(content)
      console.log(height)
      if (height) {
        embed[name]!.height = height
      }
      break
    }

    case `og:${name}:alt`:
      embed[name]!.alt = content
      break
  }
}

function convertToEmbed(meta: Meta[]) {
  let embed: Partial<Embed> = {}
  for (let { property, content } of meta) {
    if (content == null) {
      continue
    }

    if (property.startsWith('audio')) {
      if (embed.audio == null) {
        embed.audio = {}
      }
    }

    // Misc
    switch (property) {
      case 'theme-color': {
        embed.color = embed.color ?? content
        break
      }
    }

    // todo(bree): Twitter
    if (property.startsWith('twitter')) {
    }

    // OGP
    if (property.startsWith('og:')) {
      switch (property) {
        // Basic
        case 'og:type': {
          let type: typeof embed['type']
          let test = (value: string) => {
            if (content?.startsWith(value)) {
              type = value
            }
          }

          test('music')
          test('video')
          type = type ?? content

          embed.type = embed.type ?? type
          break
        }

        case 'og:title':
          embed.title = embed.title ?? content
          break

        case 'og:site_name':
          embed.site_name = embed.site_name ?? content
          break

        case 'og:description':
          embed.description = embed.description ?? content
          break

        case 'og:url':
          embed.url = embed.url ?? content
          break

        // Audio

        case 'og:audio':
        case 'og:audio:secure_url':
          embed.audio!.url = embed.audio?.url ?? content

        case 'og:audio:type':
          embed.audio!.type = embed.audio?.type ?? content

        default:
          // Content
          if (property.startsWith('og:image')) {
            embedContent(embed, 'image', property, content)
          } else if (property.startsWith('og:video')) {
            embedContent(embed, 'video', property, content)
          }
      }
    }
  }

  return embed
}

export async function handleRequest(request: Request): Promise<Response> {
  let url = new URL(request.url)
  let fetchUrl = url.searchParams.get('url')
  if (fetchUrl) {
    let res = await fetch(fetchUrl)

    if (!res.ok) {
      return new Response(
        `Error fetching \'${fetchUrl}\': ${res.status} ${res.statusText}`,
        {
          status: 502,
          statusText: res.statusText,
        },
      )
    }

    let rawData = await getMeta(res)

    let json = JSON.stringify({ raw: rawData, embed: convertToEmbed(rawData) })

    return new Response(json, {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    })
  } else {
    throw new Error('url search parameter is required')
  }
}
