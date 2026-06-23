import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        nebula: {
          from: '#6C3CE1',
          to: '#00D4FF',
        },
        gold: {
          400: '#FFD700',
          500: '#D4AF37',
          600: '#B8960C',
        },
        silver: {
          400: '#C0C0C0',
          500: '#A8A8A8',
        },
      },
      animation: {
        shimmer: 'shimmer 2s ease-in-out infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
        'particle-float': 'particleFloat 20s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'levitate': 'levitate 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'parallax-drift': 'parallaxDrift 12s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-scale': 'fadeInScale 0.5s ease-out forwards',
        'tilt-float': 'tiltFloat 8s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(108, 60, 225, 0.3)' },
          '50%': { borderColor: 'rgba(0, 212, 255, 0.6)' },
        },
        particleFloat: {
          '0%, 100%': { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: '0.3' },
          '25%': { transform: 'translateY(-30px) translateX(15px) rotate(90deg)', opacity: '0.6' },
          '50%': { transform: 'translateY(-60px) translateX(-10px) rotate(180deg)', opacity: '0.3' },
          '75%': { transform: 'translateY(-30px) translateX(20px) rotate(270deg)', opacity: '0.6' },
        },
        levitate: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(108, 60, 225, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 212, 255, 0.4)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        parallaxDrift: {
          '0%, 100%': { transform: 'translateX(0) scale(1)' },
          '50%': { transform: 'translateX(-10px) scale(1.02)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        tiltFloat: {
          '0%, 100%': { transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' },
          '25%': { transform: 'perspective(1000px) rotateX(2deg) rotateY(-2deg)' },
          '75%': { transform: 'perspective(1000px) rotateX(-2deg) rotateY(2deg)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', filter: 'blur(60px)' },
          '50%': { opacity: '0.8', filter: 'blur(80px)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      backgroundSize: {
        '200%': '200% 200%',
      },
      perspective: {
        '1000': '1000px',
        '1500': '1500px',
      },
    },
  },
  plugins: [],
}
export default config
