// UI/UX Design Collector - Content Script
// Extracts design elements from the current page

(function() {
  'use strict';

  const DesignExtractor = {
    // Extract all colors used in the page
    extractColors() {
      const colors = new Map();
      const elements = document.querySelectorAll('*');

      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const props = [
          'backgroundColor',
          'color',
          'borderColor',
          'borderTopColor',
          'borderBottomColor',
          'borderLeftColor',
          'borderRightColor',
          'outlineColor',
          'boxShadow'
        ];

        props.forEach(prop => {
          const value = style[prop];
          if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
            const hex = this.rgbToHex(value);
            if (hex && hex !== '#000000' && hex !== '#FFFFFF') {
              const count = colors.get(hex) || 0;
              colors.set(hex, count + 1);
            }
          }
        });
      });

      // Sort by frequency and return top colors
      return Array.from(colors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([color, count]) => ({
          hex: color,
          count,
          category: this.categorizeColor(color)
        }));
    },

    // Convert RGB to Hex
    rgbToHex(rgb) {
      if (!rgb) return null;

      // Handle hex already
      if (rgb.startsWith('#')) return rgb.toUpperCase();

      // Handle rgb/rgba
      const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;

      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);

      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('').toUpperCase();
    },

    // Categorize color by hue/brightness
    categorizeColor(hex) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2 / 255;

      if (l > 0.9) return 'background-light';
      if (l < 0.1) return 'text-dark';
      if (r > g && r > b) return 'accent-warm';
      if (b > r && b > g) return 'accent-cool';
      if (g > r && g > b) return 'accent-nature';
      return 'neutral';
    },

    // Extract typography information
    extractTypography() {
      const fonts = new Map();
      const fontSizes = new Map();
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button, li, td, th, label, input');

      elements.forEach(el => {
        const style = window.getComputedStyle(el);

        // Font family
        const fontFamily = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        if (fontFamily) {
          const count = fonts.get(fontFamily) || 0;
          fonts.set(fontFamily, count + 1);
        }

        // Font size
        const fontSize = style.fontSize;
        if (fontSize) {
          const count = fontSizes.get(fontSize) || 0;
          fontSizes.set(fontSize, count + 1);
        }
      });

      // Get heading styles specifically
      const headingStyles = [];
      for (let i = 1; i <= 6; i++) {
        const heading = document.querySelector(`h${i}`);
        if (heading) {
          const style = window.getComputedStyle(heading);
          headingStyles.push({
            tag: `h${i}`,
            fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing
          });
        }
      }

      return {
        fonts: Array.from(fonts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([font, count]) => ({ font, count })),
        fontSizes: Array.from(fontSizes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([size, count]) => ({ size, count })),
        headingStyles
      };
    },

    // Extract layout information
    extractLayout() {
      const body = document.body;
      const bodyStyle = window.getComputedStyle(body);

      // Detect container widths
      const containers = document.querySelectorAll('[class*="container"], [class*="wrapper"], main, article');
      const containerWidths = [];
      containers.forEach(c => {
        const w = c.offsetWidth;
        if (w > 100 && !containerWidths.includes(w)) {
          containerWidths.push(w);
        }
      });

      // Detect grid/flex usage
      const flexElements = document.querySelectorAll('[style*="flex"], [class*="flex"]');
      const gridElements = document.querySelectorAll('[style*="grid"], [class*="grid"]');

      // Detect spacing patterns
      const spacings = new Set();
      document.querySelectorAll('section, div, article').forEach(el => {
        const style = window.getComputedStyle(el);
        ['padding', 'margin', 'gap'].forEach(prop => {
          const value = style[prop];
          if (value && value !== '0px') {
            spacings.add(value);
          }
        });
      });

      return {
        containerWidths: containerWidths.sort((a, b) => b - a).slice(0, 5),
        usesFlexbox: flexElements.length > 0,
        usesGrid: gridElements.length > 0,
        flexCount: flexElements.length,
        gridCount: gridElements.length,
        commonSpacings: Array.from(spacings).slice(0, 10)
      };
    },

    // Extract visual effects
    extractEffects() {
      const effects = {
        shadows: [],
        borderRadius: new Set(),
        gradients: [],
        blur: false,
        animations: [],
        transitions: new Set(),
        transforms: new Set(),
        interactions: []
      };

      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);

        // Box shadows
        if (style.boxShadow && style.boxShadow !== 'none') {
          if (!effects.shadows.includes(style.boxShadow)) {
            effects.shadows.push(style.boxShadow);
          }
        }

        // Border radius
        if (style.borderRadius && style.borderRadius !== '0px') {
          effects.borderRadius.add(style.borderRadius);
        }

        // Gradients
        if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
          if (!effects.gradients.includes(style.backgroundImage)) {
            effects.gradients.push(style.backgroundImage);
          }
        }

        // Backdrop blur
        if (style.backdropFilter && style.backdropFilter !== 'none') {
          effects.blur = true;
        }

        // Animations
        if (style.animationName && style.animationName !== 'none') {
          if (!effects.animations.includes(style.animationName)) {
            effects.animations.push(style.animationName);
          }
        }

        // Transitions
        if (style.transition && style.transition !== 'none' && style.transition !== 'all 0s ease 0s') {
          effects.transitions.add(style.transitionProperty + ' ' + style.transitionDuration);
        }

        // Transforms
        if (style.transform && style.transform !== 'none') {
          const transformType = style.transform.match(/^(\w+)/)?.[1];
          if (transformType) effects.transforms.add(transformType);
        }
      });

      // Detect interactive elements
      const buttons = document.querySelectorAll('button, [role="button"], a.btn, .button');
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
      const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"], [role="dialog"]');
      const dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="menu"], select');
      const carousels = document.querySelectorAll('[class*="carousel"], [class*="slider"], [class*="swiper"]');
      const accordions = document.querySelectorAll('[class*="accordion"], [class*="collapse"], details');
      const tabs = document.querySelectorAll('[role="tablist"], [class*="tabs"]');
      const tooltips = document.querySelectorAll('[class*="tooltip"], [data-tooltip]');
      const scrollAnim = document.querySelectorAll('[class*="aos"], [class*="scroll"], [class*="reveal"], [class*="animate"]');

      if (buttons.length > 0) effects.interactions.push(`buttons(${buttons.length})`);
      if (cards.length > 0) effects.interactions.push(`cards(${cards.length})`);
      if (modals.length > 0) effects.interactions.push('modals');
      if (dropdowns.length > 0) effects.interactions.push('dropdowns');
      if (carousels.length > 0) effects.interactions.push('carousel/slider');
      if (accordions.length > 0) effects.interactions.push('accordions');
      if (tabs.length > 0) effects.interactions.push('tabs');
      if (tooltips.length > 0) effects.interactions.push('tooltips');
      if (scrollAnim.length > 0) effects.interactions.push('scroll-animations');

      // Detect parallax
      if (document.querySelector('[class*="parallax"]') ||
          document.querySelector('[data-parallax]') ||
          document.querySelector('[class*="sticky"]')) {
        effects.interactions.push('parallax/sticky');
      }

      effects.borderRadius = Array.from(effects.borderRadius).slice(0, 5);
      effects.shadows = effects.shadows.slice(0, 5);
      effects.gradients = effects.gradients.slice(0, 5);
      effects.transitions = Array.from(effects.transitions).slice(0, 8);
      effects.transforms = Array.from(effects.transforms).slice(0, 5);

      return effects;
    },

    // Detect UI style category
    detectStyleCategory(colors, effects, layout) {
      const categories = [];

      // Check for glassmorphism
      if (effects.blur && colors.some(c => c.hex.includes('rgba'))) {
        categories.push('Glassmorphism');
      }

      // Check for minimalism
      if (colors.length < 6 && effects.shadows.length < 2) {
        categories.push('Minimalism');
      }

      // Check for bento grid
      if (layout.usesGrid && layout.gridCount > 3) {
        categories.push('Bento Box Grid');
      }

      // Check for dark mode
      const darkBg = colors.find(c => {
        const hex = c.hex;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return (r + g + b) / 3 < 50;
      });
      if (darkBg && darkBg.count > 5) {
        categories.push('Dark Mode');
      }

      // Check for neubrutalism
      const hasBoldBorders = effects.shadows.some(s => s.includes('0 0'));
      if (hasBoldBorders && colors.some(c => ['#FF0000', '#0000FF', '#FFFF00', '#FF00FF'].includes(c.hex))) {
        categories.push('Neubrutalism');
      }

      return categories.length > 0 ? categories : ['Modern/Custom'];
    },

    // Main extraction function
    extract() {
      const colors = this.extractColors();
      const typography = this.extractTypography();
      const layout = this.extractLayout();
      const effects = this.extractEffects();
      const styleCategories = this.detectStyleCategory(colors, effects, layout);

      return {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        colors,
        typography,
        layout,
        effects,
        styleCategories,
        meta: {
          viewport: document.querySelector('meta[name="viewport"]')?.content || 'not set',
          themeColor: document.querySelector('meta[name="theme-color"]')?.content || null
        }
      };
    }
  };

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractDesign') {
      try {
        const data = DesignExtractor.extract();
        sendResponse({ success: true, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
    return true; // Keep message channel open for async response
  });
})();
