module.exports = {
  experimental: {
    uniformColorPalette: true,
    extendedSpacingScale: true,
    darkModeVariant: true,
  },
  dark: 'class',
  purge: ['./src/**/*.js'],
  theme: {
    extend: {
      boxShadow: {
        white:
          '0 1px 3px 0 rgba(255, 255, 255, 0.1), 0 1px 2px 0 rgba(255, 255, 255, 0.06)',
      },
    },
  },
  variants: {
    display: ({ variants }) => [...variants('display'), 'dark'],
    boxShadow: ({ variants }) => [...variants('boxShadow'), 'dark'],
  },
}
