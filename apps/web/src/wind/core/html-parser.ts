/**
 * HTML 解析器
 * 将 HTML 文章（微信公众号、博客等）转换为 Markdown
 * 纯前端实现，使用浏览器 DOMParser API
 */

import type { HtmlParseOptions, ImageAsset, ParsedDocument } from '../types'

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

export class HtmlParser {
  private images: ImageAsset[] = []
  private imageIndex = 0
  private options: HtmlParseOptions

  constructor(options?: Partial<HtmlParseOptions>) {
    this.options = {
      preserveImages: true,
      extractTitle: true,
      cleanupStyles: true,
      ...options,
    }
  }

  /**
   * 从 HTML 字符串解析
   */
  parseFromString(html: string): ParsedDocument {
    this.images = []
    this.imageIndex = 0

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // 提取元数据
    const title = this.extractTitle(doc)
    const author = this.extractAuthor(doc)

    // 定位文章主体
    const contentRoot = this.findContentRoot(doc)
    if (!contentRoot) {
      // fallback: 用整个 body
      const body = doc.body
      const markdown = body ? this.convertNode(body).trim() : ''
      return {
        content: title ? `# ${title}\n\n${markdown}` : markdown,
        images: this.images,
        metadata: { title, author, createdAt: new Date(), modifiedAt: new Date() },
      }
    }

    // 转换为 Markdown
    let markdown = this.convertNode(contentRoot).trim()

    // 清理多余空行（3+ → 2）
    markdown = markdown.replace(/\n{3,}/g, '\n\n')

    // 修复相邻加粗的解析问题：将 **text1****text2** 合并为 **text1text2**
    // 仅当中间是空白或为空时才合并，且避免误删正常内容的加粗
    markdown = markdown.replace(/(\*\*[^*]+\*\*)\s*(\*\*[^*]+\*\*)/g, (_, p1, p2) => {
      return p1.slice(0, -2) + p2.slice(2)
    })

    // 如果有标题，添加到最前面
    if (title && !markdown.startsWith(`# ${title}`)) {
      markdown = `# ${title}\n\n${markdown}`
    }

    return {
      content: markdown,
      images: this.images,
      metadata: {
        title,
        author,
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    }
  }

  /**
   * 从 File 对象解析 .html 文件
   */
  async parseFromFile(file: File): Promise<ParsedDocument> {
    const html = await file.text()
    return this.parseFromString(html)
  }

  /**
   * 提取文章标题
   */
  private extractTitle(doc: Document): string | undefined {
    // 1. og:title（微信常用）
    const ogTitle = doc.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      const content = ogTitle.getAttribute('content')
      if (content)
        return content.trim()
    }

    // 2. <title>
    const titleEl = doc.querySelector('title')
    if (titleEl && titleEl.textContent) {
      const t = titleEl.textContent.trim()
      // 微信文章 title 有时后面有站点名
      if (t && t !== 'Weixin Official Accounts Platform')
        return t
    }

    // 3. h1
    const h1 = doc.querySelector('h1')
    if (h1 && h1.textContent)
      return h1.textContent.trim()

    return undefined
  }

  /**
   * 提取作者
   */
  private extractAuthor(doc: Document): string | undefined {
    const authorMeta = doc.querySelector('meta[name="author"]')
      || doc.querySelector('meta[property="og:article:author"]')
      || doc.querySelector('meta[property="twitter:creator"]')
    if (authorMeta) {
      const content = authorMeta.getAttribute('content')
      if (content)
        return content.trim()
    }
    return undefined
  }

  /**
   * 定位文章内容主体
   */
  private findContentRoot(doc: Document): Element | null {
    // 微信公众号常见选择器
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

  /**
   * 递归转换 DOM 节点
   */
  private convertNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return this.escapeText(node.textContent || '')
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }

    const el = node as Element
    const tag = el.tagName

    // 跳过不需要转换的标签
    if (SKIP_TAGS.has(tag))
      return ''

    // 跳过微信 UI 元素
    if (this.shouldSkipElement(el))
      return ''

    // 分派转换
    switch (tag) {
      case 'H1': return `\n\n# ${this.getInlineText(el)}\n\n`
      case 'H2': return `\n\n## ${this.getInlineText(el)}\n\n`
      case 'H3': return `\n\n### ${this.getInlineText(el)}\n\n`
      case 'H4': return `\n\n#### ${this.getInlineText(el)}\n\n`
      case 'H5': return `\n\n##### ${this.getInlineText(el)}\n\n`
      case 'H6': return `\n\n###### ${this.getInlineText(el)}\n\n`

      case 'BR':
        return '\n'

      case 'HR':
        return '\n\n---\n\n'

      case 'STRONG':
      case 'B':
        return this.convertBold(el)

      case 'EM':
      case 'I':
        return this.convertItalic(el)

      case 'CODE':
        return this.convertInlineCode(el)

      case 'PRE':
        return this.convertPreBlock(el)

      case 'A':
        return this.convertLink(el)

      case 'IMG':
        return this.convertImage(el)

      case 'UL':
        return this.convertList(el, false)

      case 'OL':
        return this.convertList(el, true)

      case 'LI':
        return this.convertChildren(el)

      case 'BLOCKQUOTE':
        return this.convertBlockquote(el)

      case 'TABLE':
        return this.convertTable(el)

      case 'DIV':
      case 'SECTION':
      case 'ARTICLE':
      case 'MAIN':
      case 'HEADER':
      case 'FOOTER':
      case 'P': // P was handled separately but lacks alignment logic, let's process it with block logic
        return this.convertBlock(el)

      case 'SPAN':
        return this.convertSpan(el)

      case 'FIGURE':
        return this.convertFigure(el)

      case 'FIGCAPTION':
        return `\n*${this.getInlineText(el)}*\n`

      case 'DEL':
      case 'S':
        return `~~${this.getInlineText(el)}~~`

      case 'SUP':
        return `^${this.getInlineText(el)}^`

      case 'SUB':
        return `~${this.getInlineText(el)}~`

      case 'MARK':
        return `==${this.getInlineText(el)}==`

      // WeChat custom tags — just process children
      case 'MPPROFILE':
      case 'MP-COMMON-PROFILE':
      case 'MP-MINIPROGRAM':
      case 'MPVOICE':
        return ''

      default:
        return this.convertChildren(el)
    }
  }

  /**
   * 判断是否应跳过该元素
   */
  private shouldSkipElement(el: Element): boolean {
    const className = el.className || ''
    if (typeof className !== 'string')
      return false

    return WECHAT_SKIP_CLASSES.some(cls => className.includes(cls))
  }

  /**
   * 获取元素的内联文本（递归处理子节点）
   */
  private getInlineText(el: Element): string {
    return this.convertChildren(el).trim()
  }

  /**
   * 转换所有子节点
   */
  private convertChildren(el: Element): string {
    let result = ''
    for (const child of Array.from(el.childNodes)) {
      result += this.convertNode(child)
    }
    return result
  }

  /**
   * 提取保留换行和空格的文本内容 (Issue 2)
   */
  private extractCodeText(el: Element): string {
    let result = ''
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        // 使用 nodeValue 而不是 escapeText，保持原始空格和换行
        result += child.nodeValue || ''
      }
      else if (child.nodeType === Node.ELEMENT_NODE) {
        if ((child as Element).tagName === 'BR') {
          result += '\n'
        }
        else {
          result += this.extractCodeText(child as Element)
        }
      }
    }
    return result
  }

  /**
   * 转换加粗
   */
  private convertBold(el: Element): string {
    const text = this.getInlineText(el)
    if (!text.trim())
      return ''
    // 避免重复加粗
    if (text.startsWith('**') && text.endsWith('**'))
      return text
    return `**${text}**`
  }

  /**
   * 转换斜体
   */
  private convertItalic(el: Element): string {
    const text = this.getInlineText(el)
    if (!text.trim())
      return ''
    // 避免重复斜体
    if (text.startsWith('*') && text.endsWith('*') && !text.startsWith('**'))
      return text
    return `*${text}*`
  }

  /**
   * 转换行内代码
   */
  private convertInlineCode(el: Element): string {
    // 如果父元素是 PRE，不处理（由 convertPreBlock 处理）
    if (el.parentElement?.tagName === 'PRE')
      return el.textContent || ''

    const text = el.textContent || ''
    if (!text.trim())
      return ''
    return `\`${text}\``
  }

  /**
   * 转换代码块
   */
  private convertPreBlock(el: Element): string {
    const codeEl = el.querySelector('code')
    const text = this.extractCodeText(codeEl || el)
    if (!text.trim())
      return ''

    // 尝试检测语言
    let lang = ''
    if (codeEl) {
      const cls = codeEl.className || ''
      const langMatch = cls.match(/(?:language-|lang-)(\w+)/)
      if (langMatch)
        lang = langMatch[1]
    }

    return `\n\n\`\`\`${lang}\n${text.trim()}\n\`\`\`\n\n`
  }

  /**
   * 转换链接
   */
  private convertLink(el: Element): string {
    const href = el.getAttribute('href') || ''
    const text = this.getInlineText(el)

    if (!text.trim())
      return ''

    // 跳过 javascript: 和空链接
    if (!href || href.startsWith('javascript:') || href === '#')
      return text

    return `[${text}](${href})`
  }

  /**
   * 转换图片
   */
  private convertImage(el: Element): string {
    if (!this.options.preserveImages)
      return ''

    // 获取图片来源（微信优先 data-src）
    let src = el.getAttribute('data-src')
      || el.getAttribute('data-croporisrc')
      || el.getAttribute('src')
      || ''

    // 跳过 base64 占位图
    if (!src || src.startsWith('data:image/png;base64,iVBOR') || src.startsWith('data:image/gif'))
      return ''

    // 确保 src 处理
    if (src.startsWith('//')) {
      src = `https:${src}`
    }

    // 处理本地保存的文件路径
    if (this.options.imageBasePath && src.includes('_files/')) {
      // 使用本地路径
      const filename = src.split('/').pop() || src
      src = `${this.options.imageBasePath}/${filename}`
    }

    const alt = el.getAttribute('alt')
      || el.getAttribute('data-type')
      || ''

    // 记录图片资源
    const imageId = `html_img_${this.imageIndex++}`
    this.images.push({
      id: imageId,
      originalName: src.split('/').pop() || `image_${this.imageIndex}`,
      blob: new Blob(), // placeholder, actual blob handled by caller if needed
      position: -1,
      alt: alt || undefined,
    })

    // 使用 HTML 标签输出图片，以支持更细粒度的属性（如 referrerpolicy）
    // 虽然核心渲染器已经加了，但这里直接输出 HTML 也是一种选择，不过为了兼容性还是用 Markdown
    return `\n\n![${alt}](${src})\n\n`
  }

  /**
   * 转换列表
   */
  private convertList(el: Element, ordered: boolean): string {
    const items: string[] = []
    let index = 1

    for (const child of Array.from(el.children)) {
      if (child.tagName === 'LI') {
        // 使用 DOM 递归方式移除可能存在的序号，这比正则处理生成的 HTML 更稳健
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

  /**
   * 递归移除节点中的首个列表序号/符号 (Issue 4/7)
   */
  private stripBulletFromNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (!text.replace(/[\s\u200B]/g, '').trim())
        return false // 跳过只包含空白或可见度为0字符的节点

      // 允许匹配首部可能存在的空白、点、顿号、列表符号以及各种不可见字符
      const bulletRegex = /^[\s\u200B]*\d+[.、]\s*|^[\s\u200B]*[•\-*]\s*/
      const stripped = text.replace(bulletRegex, '')

      if (stripped !== text) {
        node.textContent = stripped
        return true
      }
      return true
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      // 跳过某些特定元素（如图片）
      if (el.tagName === 'IMG' || el.tagName === 'BR')
        return true

      for (const child of Array.from(node.childNodes)) {
        if (this.stripBulletFromNode(child))
          return true
      }
    }
    return false
  }

  /**
   * 转换引用块
   */
  private convertBlockquote(el: Element): string {
    const content = this.getInlineText(el)
    if (!content.trim())
      return ''

    const lines = content.trim().split('\n').map(line => `> ${line}`)
    return `\n\n${lines.join('\n')}\n\n`
  }

  /**
   * 转换表格
   */
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

    // 确保所有行列数一致
    const maxCols = Math.max(...rows.map(r => r.length))
    for (const row of rows) {
      while (row.length < maxCols) row.push('')
    }

    // 构建 markdown 表格
    const header = `| ${rows[0].join(' | ')} |`
    const separator = `| ${rows[0].map(() => '---').join(' | ')} |`
    const body = rows.slice(1).map(row => `| ${row.join(' | ')} |`).join('\n')

    return `\n\n${header}\n${separator}\n${body}\n\n`
  }

  /**
   * 转换块级元素
   */
  private convertBlock(el: Element): string {
    const style = el.getAttribute('style') || ''

    // Issue 3: 特殊装饰块检测 (带背景色和圆角)
    if ((el.tagName === 'SECTION' || el.tagName === 'DIV')
      && (style.includes('background-color') || style.includes('background:'))
      && (style.includes('border-radius') || style.includes('padding:'))) {
      // 保留这种复杂的装饰块为 HTML，确保完美还原
      // 清空原始 style 中的特定不兼容部分（如果有）
      const cleanStyle = style
        .replace(/display:\s*flex[^;]*;?/gi, '')
        .replace(/place-items:[^;]*;?/gi, '')

      return `\n\n<section style="${cleanStyle}">\n\n${this.convertChildren(el).trim()}\n\n</section>\n\n`
    }

    let content = this.convertChildren(el).trim()
    if (!content)
      return ''

    // Issue 7: 右对齐、居中对齐检测
    let align = el.getAttribute('align') || ''
    const textAlign = this.getStyleValue(style, 'text-align')
    if (textAlign && ['left', 'center', 'right', 'justify'].includes(textAlign.toLowerCase())) {
      align = textAlign.toLowerCase()
    }

    // 用 HTML 包装对齐
    if (align === 'center') {
      content = `<div style="text-align: center;">\n\n${content}\n\n</div>`
    }
    else if (align === 'right') {
      content = `<div style="text-align: right;">\n\n${content}\n\n</div>`
    }

    return `\n\n${content}\n\n`
  }

  /**
   * 从 style 字符串中提取 CSS 属性值
   * 处理多个同名属性和 !important 优先级
   */
  private getStyleValue(style: string, property: string): string | null {
    if (!style)
      return null

    // 如果 property 是 background，则同时检查 background 和 background-color
    const properties = property === 'background' ? ['background', 'background-color'] : [property]

    // 使用正则提取所有属性对，避免分号切割的问题
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
        }
        else if (!hasImportant) {
          // 这里的逻辑：如果没有 !important，则后盖前。
          winner = cleanVal
        }
      }
    }

    return winner
  }

  /**
   * 转换 span 元素
   */
  private convertSpan(el: Element): string {
    const style = el.getAttribute('style') || ''
    let text = this.convertChildren(el)
    if (!text.trim())
      return text

    // 检查是否已经是加粗（避免冗余 **）
    const isBold = (style.includes('font-weight') && (style.includes('bold') || style.includes('700') || style.includes('800') || style.includes('900')))
      || el.querySelector('strong, b') !== null

    const isItalic = (style.includes('font-style') && style.includes('italic'))
      || el.querySelector('em, i') !== null

    // 文字颜色 Issue 4
    const color = this.getStyleValue(style, 'color')
    if (color) {
      text = `<span style="color: ${color};">${text}</span>`
    }

    // 字体大小 Issue 6
    const fontSize = this.getStyleValue(style, 'font-size')
    if (fontSize) {
      text = `<span style="font-size: ${fontSize};">${text}</span>`
    }

    // 背景色 Issue 3
    const background = this.getStyleValue(style, 'background')
    if (background) {
      text = `<mark style="background-color: ${background};">${text}</mark>`
    }

    // 处理加粗和斜体（在最外层包裹）
    if (isBold && !text.startsWith('**') && !text.endsWith('**')) {
      text = `**${text}**`
    }
    if (isItalic && !text.startsWith('*') && !text.endsWith('*')) {
      text = `*${text}*`
    }

    return text
  }

  /**
   * 转换 figure 元素
   */
  private convertFigure(el: Element): string {
    return this.convertChildren(el)
  }

  /**
   * 转义 markdown 特殊字符（仅在纯文本中）
   */
  private escapeText(text: string): string {
    // 只做最低限度的清理，保留中文和正常符号
    return text
      .replace(/\u00A0/g, ' ') // &nbsp;
      .replace(/\u200B/g, '') // zero-width space
      .replace(/\uFEFF/g, '') // BOM
  }
}
