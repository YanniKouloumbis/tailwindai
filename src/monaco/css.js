import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { setupMode } from 'monaco-editor/esm/vs/language/css/cssMode'
import {
  DiagnosticsAdapter,
  CompletionAdapter,
  DocumentColorAdapter,
  HoverAdapter,
} from 'monaco-editor/esm/vs/language/css/languageFeatures'
import { LanguageServiceDefaultsImpl } from 'monaco-editor/esm/vs/language/css/monaco.contribution'
import * as cssService from 'monaco-editor/esm/vs/language/css/_deps/vscode-css-languageservice/cssLanguageService'

export function setupCssMode(content, onChange) {
  const disposables = []

  monaco.languages.register({ id: 'tailwindcss' })

  disposables.push(
    monaco.languages.onLanguage('tailwindcss', () => {
      monaco.languages.setLanguageConfiguration(
        'tailwindcss',
        languageConfiguration
      )
      monaco.languages.setMonarchTokensProvider('tailwindcss', language)

      setupMode(
        new LanguageServiceDefaultsImpl(
          'tailwindcss',
          diagnosticsOptions,
          modeConfiguration
        )
      )
    })
  )

  const _provideCompletionItems =
    CompletionAdapter.prototype.provideCompletionItems
  CompletionAdapter.prototype.provideCompletionItems = function (
    originalModel,
    ...rest
  ) {
    if (!this._provideCompletionItems) {
      this._provideCompletionItems = _provideCompletionItems.bind(this)
    }
    return this._provideCompletionItems(
      originalModel === model ? proxyModel : originalModel,
      ...rest
    )
  }
  disposables.push({
    dispose() {
      CompletionAdapter.prototype.provideCompletionItems = _provideCompletionItems
    },
  })

  const _provideDocumentColors =
    DocumentColorAdapter.prototype.provideDocumentColors
  DocumentColorAdapter.prototype.provideDocumentColors = function (
    originalModel,
    ...rest
  ) {
    if (!this._provideDocumentColors) {
      this._provideDocumentColors = _provideDocumentColors.bind(this)
    }
    return this._provideDocumentColors(
      originalModel === model ? proxyModel : originalModel,
      ...rest
    )
  }
  disposables.push({
    dispose() {
      DocumentColorAdapter.prototype.provideDocumentColors = _provideDocumentColors
    },
  })

  const _provideHover = HoverAdapter.prototype.provideHover
  HoverAdapter.prototype.provideHover = function (originalModel, ...rest) {
    if (!this._provideHover) {
      this._provideHover = _provideHover.bind(this)
    }
    return this._provideHover(
      originalModel === model ? proxyModel : originalModel,
      ...rest
    )
  }
  disposables.push({
    dispose() {
      HoverAdapter.prototype.provideHover = _provideHover
    },
  })

  DiagnosticsAdapter.prototype._doValidate = function (resource, languageId) {
    this._worker(resource)
      .then(function (worker) {
        return worker.doValidation(
          resource.toString() === 'file:///main.css'
            ? 'file:///main.proxy.css'
            : resource.toString()
        )
      })
      .then(function (diagnostics) {
        var markers = diagnostics.map(function (d) {
          return toDiagnostics(resource, d)
        })
        var model = monaco.editor.getModel(resource)
        if (model.getModeId() === languageId) {
          monaco.editor.setModelMarkers(
            model,
            languageId,
            markers.filter(
              (marker) =>
                marker.code !== 'unknownAtRules' ||
                !/@(tailwind|screen|responsive|variants|layer|___)$/.test(
                  marker.message
                )
            )
          )
        }
      })
      .then(undefined, function (err) {
        console.error(err)
      })
  }

  const model = monaco.editor.createModel(
    content || '',
    'tailwindcss',
    'file:///main.css'
  )
  model.updateOptions({ indentSize: 2, tabSize: 2 })
  disposables.push(model)

  const proxyModel = monaco.editor.createModel(
    augmentCss(content || ''),
    'tailwindcss',
    'file:///main.proxy.css'
  )
  proxyModel.updateOptions({ indentSize: 2, tabSize: 2 })
  disposables.push(proxyModel)

  disposables.push(
    model.onDidChangeContent(() => {
      onChange()
      proxyModel.setValue(augmentCss(model.getValue()))
    })
  )

  return {
    model,
    dispose() {
      disposables.forEach((disposable) => disposable.dispose())
    },
  }
}

const languageConfiguration = {
  wordPattern: /(#?-?\d*\.\d\w*%?)|((::|[@#.!:])?[\w-?]+%?)|::|[@#.!:]/g,

  comments: {
    blockComment: ['/*', '*/'],
  },

  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],

  autoClosingPairs: [
    { open: '{', close: '}', notIn: ['string', 'comment'] },
    { open: '[', close: ']', notIn: ['string', 'comment'] },
    { open: '(', close: ')', notIn: ['string', 'comment'] },
    { open: '"', close: '"', notIn: ['string', 'comment'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
  ],

  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],

  folding: {
    markers: {
      start: new RegExp('^\\s*\\/\\*\\s*#region\\b\\s*(.*?)\\s*\\*\\/'),
      end: new RegExp('^\\s*\\/\\*\\s*#endregion\\b.*\\*\\/'),
    },
  },
}

const language = {
  defaultToken: '',
  tokenPostfix: '.css',

  ws: '[ \t\n\r\f]*', // whitespaces (referenced in several rules)
  identifier:
    '-?-?([a-zA-Z]|(\\\\(([0-9a-fA-F]{1,6}\\s?)|[^[0-9a-fA-F])))([\\w\\-]|(\\\\(([0-9a-fA-F]{1,6}\\s?)|[^[0-9a-fA-F])))*',

  brackets: [
    { open: '{', close: '}', token: 'delimiter.bracket' },
    { open: '[', close: ']', token: 'delimiter.bracket' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
    { open: '<', close: '>', token: 'delimiter.angle' },
  ],

  tokenizer: {
    root: [{ include: '@selector' }],

    selector: [
      { include: '@comments' },
      { include: '@import' },
      { include: '@strings' },
      [
        '[@](keyframes|-webkit-keyframes|-moz-keyframes|-o-keyframes)',
        { token: 'keyword', next: '@keyframedeclaration' },
      ],
      ['[@](tailwind)', { token: 'keyword', next: '@tailwinddirective' }],
      ['[@](screen)', { token: 'keyword', next: '@screenheader' }],
      ['[@](variants)', { token: 'keyword', next: '@variantsheader' }],
      ['[@](responsive)', { token: 'keyword', next: '@responsiveheader' }],
      ['[@](layer)', { token: 'keyword', next: '@layerheader' }],
      ['[@](page|content|font-face|-moz-document)', { token: 'keyword' }],
      [
        '[@](charset|namespace)',
        { token: 'keyword', next: '@declarationbody' },
      ],
      [
        '(url-prefix)(\\()',
        [
          'attribute.value',
          { token: 'delimiter.parenthesis', next: '@urldeclaration' },
        ],
      ],
      [
        '(url)(\\()',
        [
          'attribute.value',
          { token: 'delimiter.parenthesis', next: '@urldeclaration' },
        ],
      ],
      { include: '@selectorname' },
      ['[\\*]', 'tag'], // selector symbols
      ['[>\\+,]', 'delimiter'], // selector operators
      ['\\[', { token: 'delimiter.bracket', next: '@selectorattribute' }],
      ['{', { token: 'delimiter.bracket', next: '@selectorbody' }],
    ],

    selectorbody: [
      { include: '@comments' },
      [
        '[*_]?@identifier@ws:(?=(\\s|\\d|[^{;}]*[;}]))',
        'attribute.name',
        '@rulevalue',
      ], // rule definition: to distinguish from a nested selector check for whitespace, number or a semicolon
      ['}', { token: 'delimiter.bracket', next: '@pop' }],

      ['[@]apply', { token: 'keyword', next: '@applybody' }],
    ],

    applybody: [{ include: '@selectorname' }, [';', 'delimiter', '@pop']],

    selectorname: [
      ['(\\.|#(?=[^{])|%|(@identifier)|:)+', 'tag'], // selector (.foo, div, ...)
    ],

    selectorattribute: [
      { include: '@term' },
      [']', { token: 'delimiter.bracket', next: '@pop' }],
    ],

    term: [
      { include: '@comments' },
      [
        '(url-prefix)(\\()',
        [
          'attribute.value',
          { token: 'delimiter.parenthesis', next: '@urldeclaration' },
        ],
      ],
      [
        '(url)(\\()',
        [
          'attribute.value',
          { token: 'delimiter.parenthesis', next: '@urldeclaration' },
        ],
      ],
      [
        '(theme)(\\()',
        [
          'attribute.value',
          { token: 'delimiter.parenthesis', next: '@urldeclaration' },
        ],
      ],
      { include: '@functioninvocation' },
      { include: '@numbers' },
      { include: '@name' },
      ['([<>=\\+\\-\\*\\/\\^\\|\\~,])', 'delimiter'],
      [',', 'delimiter'],
    ],

    rulevalue: [
      { include: '@comments' },
      { include: '@strings' },
      { include: '@term' },
      ['!important', 'keyword'],
      [';', 'delimiter', '@pop'],
      ['(?=})', { token: '', next: '@pop' }], // missing semicolon
    ],

    warndebug: [
      ['[@](warn|debug)', { token: 'keyword', next: '@declarationbody' }],
    ],

    import: [['[@](import)', { token: 'keyword', next: '@declarationbody' }]],

    urldeclaration: [
      { include: '@strings' },
      ['[^)\r\n]+', 'string'],
      ['\\)', { token: 'delimiter.parenthesis', next: '@pop' }],
    ],

    parenthizedterm: [
      { include: '@term' },
      ['\\)', { token: 'delimiter.parenthesis', next: '@pop' }],
    ],

    declarationbody: [
      { include: '@term' },
      [';', 'delimiter', '@pop'],
      ['(?=})', { token: '', next: '@pop' }], // missing semicolon
    ],

    comments: [
      ['\\/\\*', 'comment', '@comment'],
      ['\\/\\/+.*', 'comment'],
    ],

    comment: [
      ['\\*\\/', 'comment', '@pop'],
      [/[^*/]+/, 'comment'],
      [/./, 'comment'],
    ],

    name: [['@identifier', 'attribute.value']],

    numbers: [
      [
        '-?(\\d*\\.)?\\d+([eE][\\-+]?\\d+)?',
        { token: 'attribute.value.number', next: '@units' },
      ],
      ['#[0-9a-fA-F_]+(?!\\w)', 'attribute.value.hex'],
    ],

    units: [
      [
        '(em|ex|ch|rem|vmin|vmax|vw|vh|vm|cm|mm|in|px|pt|pc|deg|grad|rad|turn|s|ms|Hz|kHz|%)?',
        'attribute.value.unit',
        '@pop',
      ],
    ],

    keyframedeclaration: [
      { include: '@comments' },
      ['@identifier', 'attribute.value'],
      ['{', { token: 'delimiter.bracket', switchTo: '@keyframebody' }],
    ],

    tailwinddirective: [
      { include: '@comments' },
      ['@identifier', 'attribute.value'],
      [';', 'delimiter', '@pop'],
    ],
    screenheader: [
      { include: '@comments' },
      ['@identifier', 'attribute.value'],
      ['{', { token: 'delimiter.bracket', switchTo: '@selector' }],
    ],
    layerheader: [
      { include: '@comments' },
      ['@identifier', 'attribute.value'],
      ['{', { token: 'delimiter.bracket', switchTo: '@selector' }],
    ],
    variantsheader: [
      { include: '@comments' },
      ['@identifier', 'attribute.value'],
      [',', 'delimeter'],
      ['{', { token: 'delimiter.bracket', switchTo: '@selector' }],
    ],
    responsiveheader: [
      { include: '@comments' },
      ['{', { token: 'delimiter.bracket', switchTo: '@selector' }],
    ],

    keyframebody: [
      { include: '@term' },
      ['{', { token: 'delimiter.bracket', next: '@selectorbody' }],
      ['}', { token: 'delimiter.bracket', next: '@pop' }],
    ],

    functioninvocation: [
      [
        '@identifier\\(',
        { token: 'attribute.value', next: '@functionarguments' },
      ],
    ],

    functionarguments: [
      ['\\$@identifier@ws:', 'attribute.name'],
      ['[,]', 'delimiter'],
      { include: '@term' },
      ['\\)', { token: 'attribute.value', next: '@pop' }],
    ],

    strings: [
      ['~?"', { token: 'string', next: '@stringenddoublequote' }],
      ["~?'", { token: 'string', next: '@stringendquote' }],
    ],

    stringenddoublequote: [
      ['\\\\.', 'string'],
      ['"', { token: 'string', next: '@pop' }],
      [/[^\\"]+/, 'string'],
      ['.', 'string'],
    ],

    stringendquote: [
      ['\\\\.', 'string'],
      ["'", { token: 'string', next: '@pop' }],
      [/[^\\']+/, 'string'],
      ['.', 'string'],
    ],
  },
}

const diagnosticsOptions = {
  validate: true,
  lint: {
    compatibleVendorPrefixes: 'ignore',
    vendorPrefix: 'warning',
    duplicateProperties: 'warning',
    emptyRules: 'warning',
    importStatement: 'ignore',
    boxModel: 'ignore',
    universalSelector: 'ignore',
    zeroUnits: 'ignore',
    fontFaceProperties: 'warning',
    hexColorLength: 'error',
    argumentsInColorFunction: 'error',
    unknownProperties: 'warning',
    ieHack: 'ignore',
    unknownVendorSpecificProperties: 'ignore',
    propertyIgnoredDueToDisplay: 'warning',
    important: 'ignore',
    float: 'ignore',
    idSelector: 'ignore',
  },
}

const modeConfiguration = {
  completionItems: true,
  hovers: true,
  documentSymbols: true,
  definitions: true,
  references: true,
  documentHighlights: true,
  rename: true,
  colors: true,
  foldingRanges: true,
  diagnostics: true,
  selectionRanges: true,
}

function toSeverity(lsSeverity) {
  switch (lsSeverity) {
    case cssService.DiagnosticSeverity.Error:
      return monaco.MarkerSeverity.Error
    case cssService.DiagnosticSeverity.Warning:
      return monaco.MarkerSeverity.Warning
    case cssService.DiagnosticSeverity.Information:
      return monaco.MarkerSeverity.Info
    case cssService.DiagnosticSeverity.Hint:
      return monaco.MarkerSeverity.Hint
    default:
      return monaco.MarkerSeverity.Info
  }
}

function toDiagnostics(resource, diag) {
  var code = typeof diag.code === 'number' ? String(diag.code) : diag.code
  return {
    severity: toSeverity(diag.severity),
    startLineNumber: diag.range.start.line + 1,
    startColumn: diag.range.start.character + 1,
    endLineNumber: diag.range.end.line + 1,
    endColumn: diag.range.end.character + 1,
    message: diag.message,
    code: code,
    source: diag.source,
  }
}

function augmentCss(css) {
  return css
    .replace(
      /@apply[^;}]+[;}]/g,
      (m) => '@___{}' + m.substr(6).replace(/./g, ' ')
    )
    .replace(/@screen([^{]{2,})\{/g, (_m, p1) => {
      return `@media(_)${' '.repeat(p1.length - 2)}{`
    })
    .replace(/@variants(\s[^{]+)\{/g, (_m, p1) => {
      return `@media(_)${' '.repeat(p1.length)}{`
    })
    .replace(/@responsive(\s*)\{/g, (_m, p1) => {
      return `@media(_)  ${' '.repeat(p1.length)}{`
    })
    .replace(/@layer([^{]{3,})\{/g, (_m, p1) => {
      return `@media(_)${' '.repeat(p1.length - 3)}{`
    })
}
