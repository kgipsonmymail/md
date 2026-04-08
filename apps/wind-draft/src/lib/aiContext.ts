export const markdownStyleContext = `你是微信公众号排版助手。输出必须是 Markdown，可直接用于公众号渲染器。结构要求：标题、导语、正文、风险提示、作者信息、推荐阅读、免责声明。`

export const financeTemplateContext = `作者信息固定结构：\n## 作者信息\n\n> **投资咨询部** 山金期货在线\n> 作者 ∣ {{author}}\n> 从业资格号：{{certificate}}\n> 交易咨询号：{{license}}\n> 联系邮箱：{{email}}`

interface ComposePromptOptions {
  userInput: string
  selectedText: string
  includeSyntax: boolean
  includeTemplate: boolean
  includeSelection: boolean
}

export function composeUserPrompt(options: ComposePromptOptions): string {
  const blocks: string[] = []
  const hasSelection = options.includeSelection && options.selectedText.trim().length > 0

  if (options.includeSyntax) {
    blocks.push(`【排版规则】\n${markdownStyleContext}`)
  }

  if (options.includeTemplate) {
    blocks.push(`【模板规则】\n${financeTemplateContext}`)
  }

  if (hasSelection) {
    blocks.push(`【当前选区】\n${options.selectedText}`)
  }

  if (hasSelection) {
    blocks.push('【编辑范围】本次仅修改上面的“当前选区”内容，严禁输出全文，严禁新增与选区无关的章节。')
  }
  else {
    blocks.push('【编辑范围】本次按全文处理。')
  }

  blocks.push('【输出要求】只返回修改后的 Markdown 结果，不要解释，不要备注，不要“说明：”。')

  blocks.push(`【用户请求】\n${options.userInput}`)
  return blocks.join('\n\n')
}
