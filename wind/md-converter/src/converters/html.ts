import { JSDOM } from 'jsdom'
import type { ConvertResult, ConvertOptions } from '../types.js'

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'LINK',
  'META',
  'HEAD',
  'IFRAME',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'BUTTON',
  'INPUT',
  'SELECT',
  'TEXTAREA',
  'FORM',
  'NAV',
])

const WECHAT_SKIP_CLASSES = [
  'qr_code_pc',
  'reward_area',
  'like_area',
  'read_more_area',
  'appmsg_comment_area',
  'original_area',
  'profile_container',
  'function_mod',
  'related_article',
  'js_tail_section',
  'original_panel',
  'weui-',
  'appmsg_more',
  'rich_media_tool',
  'rich_media_meta',
  'article-bottom',
  'mp_profile_iframe',
  'wx_qrcode',
  'js_appmsg_comment_area',
]

export class HtmlConverter {
  private imageIndex = 0

  convert(options: ConvertOptions): ConvertResult {
    try {
      const html = options.buffer.toString('utf-8')
      const dom = new JSDOM(html)
      const doc = dom.window.document

      const title = this.extractTitle(doc)
      let contentRoot = this.findContentRoot(doc)

      let markdown: string
      if (!contentRoot) {
        const body = doc.body
        markdown = body ? this.convertNode(body).trim() : ''
      } else {
        markdown = this.convertNode(contentRoot).trim()
      }

      markdown = markdown.replace(/\n{3,}/g, '\n\n')

      markdown = markdown.replace(/(\*\*[^*]+\*\*)\s*(\*\*[^*]+\*\*)/g, (_, p1, p2) => {
        return p1.slice(0, -2) + p2.slice(2)
      })

      if (title && !markdown.startsWith(`# ${title}`)) {
        markdown = `# ${title}\n\n${markdown}`
      }

      return {
        success: true,
        markdown,
        filename: options.filename.replace(/\.html?$/, '.md'),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private extractTitle(doc: Document): string | undefined {
    const ogTitle = doc.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      const content = ogTitle.getAttribute('content')
      if (content) return content.trim()
    }

    const titleEl = doc.querySelector('title')
    if (titleEl && titleEl.textContent) {
      const t = titleEl.textContent.trim()
      if (t && t !== 'Weixin Official Accounts Platform')
        return t
    }

    const h1 = doc.querySelector('h1')
    if (h1 && h1.textContent)
      return h1.textContent.trim()

    return undefined
  }

  private findContentRoot(doc: Document): Element | null {
    const selectors = [
      '#js_content',
      '.rich_media_content',
      '#img-content',
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
    ]

    for (const sel of selectors) {
      const el = doc.querySelector(sel)
      if (el && el.textContent && el.textContent.trim().length > 50)
        return el
    }

    return null
  }

  private convertNode(node: Node): string {
    if (node.nodeType === node.TEXT_NODE) {
      return this.escapeText(node.textContent || '')
    }

    if (node.nodeType !== node.ELEMENT_NODE) {
      return ''
    }

    const el = node as Element
    const tag = el.tagName

    if (SKIP_TAGS.has(tag))
      return ''

    if (this.shouldSkipElement(el))
      return ''

    switch (tag) {
      case 'H1': return `\n\n# ${this.getInlineText(el)}\n\n`
      case 'H2': return `\n\n## ${this.getInlineText(el)}\n\n`
      case 'H3': return `\n\n### ${this.getInlineText(el)}\n\n`
      case 'H4': return `\n\n#### ${this.getInlineText(el)}\n\n`
      case 'H5': return `\n\n##### ${this.getInlineText(el)}\n\n`
      case 'H6': return `\n\n###### ${this.getInlineText(el)}\n\n`
      case 'BR': return '\n'
      case 'HR': return '\n\n---\n\n'
      case 'STRONG':
      case 'B': return this.convertBold(el)
      case 'EM':
      case 'I': return this.convertItalic(el)
      case 'CODE': return this.convertInlineCode(el)
      case 'PRE': return this.convertPreBlock(el)
      case 'A': return this.convertLink(el)
      case 'IMG': return this.convertImage(el)
      case 'UL': return this.convertList(el, false)
      case 'OL': return this.convertList(el, true)
      case 'LI': return this.convertChildren(el)
      case 'BLOCKQUOTE': return this.convertBlockquote(el)
      case 'TABLE': return this.convertTable(el)
      case 'DIV':
      case 'SECTION':
      case 'ARTICLE':
      case 'MAIN':
      case 'HEADER':
      case 'FOOTER':
      case 'P': return this.convertBlock(el)
      case 'SPAN': return this.convertSpan(el)
      case 'FIGURE': return this.convertFigure(el)
      case 'FIGCAPTION': return `\n*${this.getInlineText(el)}*\n`
      case 'DEL':
      case 'S': return `~~${this.getInlineText(el)}~~`
      case 'SUP': return `^${this.getInlineText(el)}^`
      case 'SUB': return `~${this.getInlineText(el)}~`
      case 'MARK': return `==${this.getInlineText(el)}==`
      case 'MPPROFILE':
      case 'MP-COMMON-PROFILE':
      case 'MP-MINIPROGRAM':
      case 'MPVOICE': return ''
      default: return this.convertChildren(el)
    }
  }

  private shouldSkipElement(el: Element): boolean {
    const className = el.className || ''
    if (typeof className !== 'string')
      return false
    return WECHAT_SKIP_CLASSES.some(cls => className.includes(cls))
  }

  private getInlineText(el: Element): string {
    return this.convertChildren(el).trim()
  }

  private convertChildren(el: Element): string {
    let result = ''
    for (const child of Array.from(el.childNodes)) {
      result += this.convertNode(child)
    }
    return result
  }

  private extractCodeText(el: Element): string {
    let result = ''
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === child.TEXT_NODE) {
        result += child.nodeValue || ''
      } else if (child.nodeType === child.ELEMENT_NODE) {
        if ((child as Element).tagName === 'BR') {
          result += '\n'
        } else {
          result += this.extractCodeText(child as Element)
        }
      }
    }
    return result
  }

  private convertBold(el: Element): string {
    const text = this.getInlineText(el)
    if (!text.trim())
      return ''
    if (text.startsWith('**') && text.endsWith('**'))
      return text
    return `**${text}**`
  }

  private convertItalic(el: Element): string {
    const text = this.getInlineText(el)
    if (!text.trim())
      return ''
    if (text.startsWith('*') && text.endsWith('*') && !text.startsWith('**'))
      return text
    return `*${text}*`
  }

  private convertInlineCode(el: Element): string {
    if (el.parentElement?.tagName === 'PRE')
      return el.textContent || ''
    const text = el.textContent || ''
    if (!text.trim())
      return ''
    return `\`${text}\``
  }

  private convertPreBlock(el: Element): string {
    const codeEl = el.querySelector('code')
    const text = this.extractCodeText(codeEl || el)
    if (!text.trim())
      return ''

    let lang = ''
    if (codeEl) {
      const cls = codeEl.className || ''
      const langMatch = cls.match(/(?:language-|lang-)(\w+)/)
      if (langMatch)
        lang = langMatch[1]
    }

    return `\n\n\`\`\`${lang}\n${text.trim()}\n\`\`\`\n\n`
  }

  private convertLink(el: Element): string {
    const href = el.getAttribute('href') || ''
    const text = this.getInlineText(el)

    if (!text.trim())
      return ''

    if (!href || href.startsWith('javascript:') || href === '#')
      return text

    return `[${text}](${href})`
  }

  private convertImage(el: Element): string {
    let src = el.getAttribute('data-src')
      || el.getAttribute('data-croporisrc')
      || el.getAttribute('src')
      || ''

    if (!src)
      return ''

    if (src.startsWith('//')) {
      src = `https:${src}`
    }

    const alt = el.getAttribute('alt')
      || el.getAttribute('data-type')
      || ''

    return `\n\n![${alt}](${src})\n\n`
  }

  private convertList(el: Element, ordered: boolean): string {
    const items: string[] = []
    let index = 1

    for (const child of Array.from(el.children)) {
      if (child.tagName === 'LI') {
        const liClone = child.cloneNode(true) as HTMLElement
        this.stripBulletFromNode(liClone)

        const content = this.convertChildren(liClone).trim()
        if (content) {
          const prefix = ordered ? `${index++}. ` : '- '
          items.push(`${prefix}${content}`)
        }
      }
    }

    if (items.length === 0)
      return ''

    return `\n\n${items.join('\n')}\n\n`
  }

  private stripBulletFromNode(node: Node): boolean {
    if (node.nodeType === node.TEXT_NODE) {
      const text = node.textContent || ''
      if (!text.replace(/[\s\u200B]/g, '').trim())
        return false

      const bulletRegex = /^[\s\u200B]*\d+[.、]\s*|^[\s\u200B]*[•\-*]\s*/
      const stripped = text.replace(bulletRegex, '')

      if (stripped !== text) {
        node.textContent = stripped
        return true
      }
      return true
    }

    if (node.nodeType === node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName === 'IMG' || el.tagName === 'BR')
        return true

      for (const child of Array.from(node.childNodes)) {
        if (this.stripBulletFromNode(child))
          return true
      }
    }
    return false
  }

  private convertBlockquote(el: Element): string {
    const content = this.getInlineText(el)
    if (!content.trim())
      return ''

    const lines = content.trim().split('\n').map(line => `> ${line}`)
    return `\n\n${lines.join('\n')}\n\n`
  }

  private convertTable(el: Element): string {
    const rows: string[][] = []
    const trElements = el.querySelectorAll('tr')

    for (const tr of Array.from(trElements)) {
      const cells: string[] = []
      const cellElements = tr.querySelectorAll('td, th')
      for (const cell of Array.from(cellElements)) {
        cells.push(this.getInlineText(cell).replace(/\|/g, '\\|').replace(/\n/g, ' '))
      }
      if (cells.length > 0)
        rows.push(cells)
    }

    if (rows.length === 0)
      return ''

    const maxCols = Math.max(...rows.map(r => r.length))
    for (const row of rows) {
      while (row.length < maxCols) row.push('')
    }

    const header = `| ${rows[0].join(' | ')} |`
    const separator = `| ${rows[0].map(() => '---').join(' | ')} |`
    const body = rows.slice(1).map(row => `| ${row.join(' | ')} |`).join('\n')

    return `\n\n${header}\n${separator}\n${body}\n\n`
  }

  private convertBlock(el: Element): string {
    const style = el.getAttribute('style') || ''

    if ((el.tagName === 'SECTION' || el.tagName === 'DIV')
      && (style.includes('background-color') || style.includes('background:'))
      && (style.includes('border-radius') || style.includes('padding:'))) {
      const cleanStyle = style
        .replace(/display:\s*flex[^;]*;?/gi, '')
        .replace(/place-items:[^;]*;?/gi, '')

      return `\n\n<section style="${cleanStyle}">\n\n${this.convertChildren(el).trim()}\n\n</section>\n\n`
    }

    let content = this.convertChildren(el).trim()
    if (!content)
      return ''

    let align = el.getAttribute('align') || ''
    const textAlign = this.getStyleValue(style, 'text-align')
    if (textAlign && ['left', 'center', 'right', 'justify'].includes(textAlign.toLowerCase())) {
      align = textAlign.toLowerCase()
    }

    if (align === 'center') {
      content = `<div style="text-align: center;">\n\n${content}\n\n</div>`
    } else if (align === 'right') {
      content = `<div style="text-align: right;">\n\n${content}\n\n</div>`
    }

    return `\n\n${content}\n\n`
  }

  private getStyleValue(style: string, property: string): string | null {
    if (!style)
      return null

    const properties = property === 'background' ? ['background', 'background-color'] : [property]

    const matches = Array.from(style.matchAll(/([^:;]+)\s*:\s*([^;]+)/g))

    let winner: string | null = null
    let hasImportant = false

    for (const match of matches) {
      const prop = match[1].trim().toLowerCase()
      if (properties.includes(prop)) {
        const val = match[2].trim()
        const isImportant = val.toLowerCase().endsWith('!important')
        const cleanVal = val.replace(/\s*!important\s*$/i, '').trim()

        if (isImportant) {
          winner = cleanVal
          hasImportant = true
        } else if (!hasImportant) {
          winner = cleanVal
        }
      }
    }

    return winner
  }

  private convertSpan(el: Element): string {
    const style = el.getAttribute('style') || ''
    let text = this.convertChildren(el)
    if (!text.trim())
      return text

    const isBold = (style.includes('font-weight') && (style.includes('bold') || style.includes('700') || style.includes('800') || style.includes('900')))
      || el.querySelector('strong, b') !== null

    const isItalic = (style.includes('font-style') && style.includes('italic'))
      || el.querySelector('em, i') !== null

    const color = this.getStyleValue(style, 'color')
    if (color) {
      text = `<span style="color: ${color};">${text}</span>`
    }

    const fontSize = this.getStyleValue(style, 'font-size')
    if (fontSize) {
      text = `<span style="font-size: ${fontSize};">${text}</span>`
    }

    const background = this.getStyleValue(style, 'background')
    if (background) {
      text = `<mark style="background-color: ${background};">${text}</mark>`
    }

    if (isBold && !text.startsWith('**') && !text.endsWith('**')) {
      text = `**${text}**`
    }
    if (isItalic && !text.startsWith('*') && !text.endsWith('*')) {
      text = `*${text}*`
    }

    return text
  }

  private convertFigure(el: Element): string {
    return this.convertChildren(el)
  }

  private escapeText(text: string): string {
    return text
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .replace(/\uFEFF/g, '')
  }
}