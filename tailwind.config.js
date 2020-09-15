module.exports = {
  experimental: {
    uniformColorPalette: true,
    extendedSpacingScale: true,
    darkModeVariant: true,
  },
  future: {
    purgeLayersByDefault: true,
  },
  dark: 'class',
  purge: {
    content: ['./src/**/*.js'],
    preserveHtmlElements: false,
    options: {
      keyframes: true,
    },
  },
  theme: {
    extend: {
      fill: (theme) => theme('colors'),
      boxShadow: {
        white:
          '0 1px 3px 0 rgba(255, 255, 255, 0.1), 0 1px 2px 0 rgba(255, 255, 255, 0.06)',
      },
      gridTemplateColumns: {
        '3-balanced': '1fr auto 1fr',
      },
      cursor: {
        'ew-resize': 'ew-resize',
        'ns-resize': 'ns-resize',
        'nwse-resize': 'nwse-resize',
      },
    },
  },
  variants: {
    boxShadow: ({ variants }) => [...variants('boxShadow'), 'dark'],
    display: ({ variants }) => [...variants('display'), 'dark'],
    fill: ({ variants }) => [...variants('fill'), 'dark'],
  },
  corePlugins: {
    container: false,
  },
}
