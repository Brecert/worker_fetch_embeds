export interface Meta {
  property: string
  content: string | null
}

export async function getMeta(response: Response) {
  let meta: Meta[] = []
  console.log(response)
  await new HTMLRewriter()
    .on(
      'meta[property]',
      new (class {
        element(element: Element) {
          let property = element.getAttribute('property')!
          let content = element.getAttribute('content')
          meta.push({ property, content })
        }
      })(),
    )
    .transform(response)
    .text()
  return meta
}
