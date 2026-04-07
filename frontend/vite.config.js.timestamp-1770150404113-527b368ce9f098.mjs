// vite.config.js
import { defineConfig } from "file:///C:/Users/Nathan/Documents/Work/Repos/BCP/anything-llm-fd/frontend/node_modules/vite/dist/node/index.js";
import { fileURLToPath, URL } from "url";

// postcss.config.js
import tailwind from "file:///C:/Users/Nathan/Documents/Work/Repos/BCP/anything-llm-fd/frontend/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///C:/Users/Nathan/Documents/Work/Repos/BCP/anything-llm-fd/frontend/node_modules/autoprefixer/lib/autoprefixer.js";

// tailwind.config.js
var tailwind_config_default = {
  darkMode: "class",
  content: {
    relative: true,
    files: [
      "./src/components/**/*.{js,jsx}",
      "./src/hooks/**/*.js",
      "./src/models/**/*.js",
      "./src/pages/**/*.{js,jsx}",
      "./src/utils/**/*.js",
      "./src/*.jsx",
      "./index.html",
      "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}"
    ]
  },
  theme: {
    extend: {
      rotate: {
        "270": "270deg",
        "360": "360deg"
      },
      colors: {
        "black-900": "#141414",
        accent: "#3D4147",
        "sidebar-button": "#31353A",
        sidebar: "#25272C",
        "historical-msg-system": "rgba(255, 255, 255, 0.05);",
        "historical-msg-user": "#2C2F35",
        outline: "#4E5153",
        "primary-button": "var(--theme-button-primary)",
        "cta-button": "var(--theme-button-cta)",
        secondary: "#2C2F36",
        "dark-input": "#18181B",
        "mobile-onboarding": "#2C2F35",
        "dark-highlight": "#1C1E21",
        "dark-text": "#222628",
        description: "#D2D5DB",
        "x-button": "#9CA3AF",
        royalblue: "#065986",
        purple: "#4A1FB8",
        magenta: "#9E165F",
        danger: "#F04438",
        error: "#B42318",
        warn: "#854708",
        success: "#05603A",
        darker: "#F4F4F4",
        teal: "#0BA5EC",
        // Generic theme colors
        theme: {
          bg: {
            primary: "var(--theme-bg-primary)",
            secondary: "var(--theme-bg-secondary)",
            sidebar: "var(--theme-bg-sidebar)",
            container: "var(--theme-bg-container)",
            chat: "var(--theme-bg-chat)",
            "chat-input": "var(--theme-bg-chat-input)",
            "popup-menu": "var(--theme-popup-menu-bg)"
          },
          text: {
            primary: "var(--theme-text-primary)",
            secondary: "var(--theme-text-secondary)",
            placeholder: "var(--theme-placeholder)"
          },
          sidebar: {
            item: {
              default: "var(--theme-sidebar-item-default)",
              selected: "var(--theme-sidebar-item-selected)",
              hover: "var(--theme-sidebar-item-hover)"
            },
            subitem: {
              default: "var(--theme-sidebar-subitem-default)",
              selected: "var(--theme-sidebar-subitem-selected)",
              hover: "var(--theme-sidebar-subitem-hover)"
            },
            footer: {
              icon: "var(--theme-sidebar-footer-icon)",
              "icon-hover": "var(--theme-sidebar-footer-icon-hover)"
            },
            border: "var(--theme-sidebar-border)"
          },
          "chat-input": {
            border: "var(--theme-chat-input-border)"
          },
          "action-menu": {
            bg: "var(--theme-action-menu-bg)",
            "item-hover": "var(--theme-action-menu-item-hover)"
          },
          settings: {
            input: {
              bg: "var(--theme-settings-input-bg)",
              active: "var(--theme-settings-input-active)",
              placeholder: "var(--theme-settings-input-placeholder)",
              text: "var(--theme-settings-input-text)"
            }
          },
          modal: {
            border: "var(--theme-modal-border)"
          },
          "file-picker": {
            hover: "var(--theme-file-picker-hover)"
          },
          attachment: {
            bg: "var(--theme-attachment-bg)",
            "error-bg": "var(--theme-attachment-error-bg)",
            "success-bg": "var(--theme-attachment-success-bg)",
            text: "var(--theme-attachment-text)",
            "text-secondary": "var(--theme-attachment-text-secondary)",
            "icon": "var(--theme-attachment-icon)",
            "icon-spinner": "var(--theme-attachment-icon-spinner)",
            "icon-spinner-bg": "var(--theme-attachment-icon-spinner-bg)"
          },
          home: {
            text: "var(--theme-home-text)",
            "text-secondary": "var(--theme-home-text-secondary)",
            "bg-card": "var(--theme-home-bg-card)",
            "bg-button": "var(--theme-home-bg-button)",
            border: "var(--theme-home-border)",
            "button-primary": "var(--theme-home-button-primary)",
            "button-primary-hover": "var(--theme-home-button-primary-hover)",
            "button-secondary": "var(--theme-home-button-secondary)",
            "button-secondary-hover": "var(--theme-home-button-secondary-hover)",
            "button-secondary-text": "var(--theme-home-button-secondary-text)",
            "button-secondary-hover-text": "var(--theme-home-button-secondary-hover-text)",
            "button-secondary-border": "var(--theme-home-button-secondary-border)",
            "button-secondary-border-hover": "var(--theme-home-button-secondary-border-hover)",
            "update-card-bg": "var(--theme-home-update-card-bg)",
            "update-card-hover": "var(--theme-home-update-card-hover)",
            "update-source": "var(--theme-home-update-source)"
          },
          checklist: {
            "item-bg": "var(--theme-checklist-item-bg)",
            "item-bg-hover": "var(--theme-checklist-item-bg-hover)",
            "item-text": "var(--theme-checklist-item-text)",
            "item-completed-bg": "var(--theme-checklist-item-completed-bg)",
            "item-completed-text": "var(--theme-checklist-item-completed-text)",
            "item-hover": "var(--theme-checklist-item-hover)",
            "checkbox-border": "var(--theme-checklist-checkbox-border)",
            "checkbox-fill": "var(--theme-checklist-checkbox-fill)",
            "checkbox-text": "var(--theme-checklist-checkbox-text)",
            "button-border": "var(--theme-checklist-button-border)",
            "button-text": "var(--theme-checklist-button-text)",
            "button-hover-bg": "var(--theme-checklist-button-hover-bg)",
            "button-hover-border": "var(--theme-checklist-button-hover-border)"
          },
          button: {
            text: "var(--theme-button-text)",
            "code-hover-text": "var(--theme-button-code-hover-text)",
            "code-hover-bg": "var(--theme-button-code-hover-bg)",
            "disable-hover-text": "var(--theme-button-disable-hover-text)",
            "disable-hover-bg": "var(--theme-button-disable-hover-bg)",
            "delete-hover-text": "var(--theme-button-delete-hover-text)",
            "delete-hover-bg": "var(--theme-button-delete-hover-bg)"
          }
        }
      },
      backgroundImage: {
        "preference-gradient": "linear-gradient(180deg, #5A5C63 0%, rgba(90, 92, 99, 0.28) 100%);",
        "chat-msg-user-gradient": "linear-gradient(180deg, #3D4147 0%, #2C2F35 100%);",
        "selected-preference-gradient": "linear-gradient(180deg, #313236 0%, rgba(63.40, 64.90, 70.13, 0) 100%);",
        "main-gradient": "linear-gradient(180deg, #3D4147 0%, #2C2F35 100%)",
        "modal-gradient": "linear-gradient(180deg, #3D4147 0%, #2C2F35 100%)",
        "sidebar-gradient": "linear-gradient(90deg, #5B616A 0%, #3F434B 100%)",
        "login-gradient": "linear-gradient(180deg, #3D4147 0%, #2C2F35 100%)",
        "menu-item-gradient": "linear-gradient(90deg, #3D4147 0%, #2C2F35 100%)",
        "menu-item-selected-gradient": "linear-gradient(90deg, #5B616A 0%, #3F434B 100%)",
        "workspace-item-gradient": "linear-gradient(90deg, #3D4147 0%, #2C2F35 100%)",
        "workspace-item-selected-gradient": "linear-gradient(90deg, #5B616A 0%, #3F434B 100%)",
        "switch-selected": "linear-gradient(146deg, #5B616A 0%, #3F434B 100%)"
      },
      fontFamily: {
        sans: [
          "plus-jakarta-sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans"',
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"'
        ]
      },
      animation: {
        sweep: "sweep 0.5s ease-in-out",
        "pulse-glow": "pulse-glow 1.5s infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out forwards",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite"
      },
      keyframes: {
        sweep: {
          "0%": { transform: "scaleX(0)", transformOrigin: "bottom left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "bottom left" }
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 }
        },
        fadeOut: {
          "0%": { opacity: 1 },
          "100%": { opacity: 0 }
        },
        "pulse-glow": {
          "0%": {
            opacity: 1,
            transform: "scale(1)",
            boxShadow: "0 0 0 rgba(255, 255, 255, 0.0)",
            backgroundColor: "rgba(255, 255, 255, 0.0)"
          },
          "50%": {
            opacity: 1,
            transform: "scale(1.1)",
            boxShadow: "0 0 15px rgba(255, 255, 255, 0.2)",
            backgroundColor: "rgba(255, 255, 255, 0.1)"
          },
          "100%": {
            opacity: 1,
            transform: "scale(1)",
            boxShadow: "0 0 0 rgba(255, 255, 255, 0.0)",
            backgroundColor: "rgba(255, 255, 255, 0.0)"
          }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" }
        }
      }
    }
  },
  variants: {
    extend: {
      backgroundColor: ["light"],
      textColor: ["light"]
    }
  },
  // Required for rechart styles to show since they can be rendered dynamically and will be tree-shaken if not safe-listed.
  safelist: [
    {
      pattern: /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"]
    },
    {
      pattern: /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"]
    },
    {
      pattern: /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"]
    },
    {
      pattern: /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/
    },
    {
      pattern: /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/
    },
    {
      pattern: /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/
    }
  ],
  plugins: [
    function({ addVariant }) {
      addVariant("light", ".light &");
      addVariant("pwa", ".pwa &");
    }
  ]
};

// postcss.config.js
var postcss_config_default = {
  plugins: [tailwind(tailwind_config_default), autoprefixer]
};

// vite.config.js
import react from "file:///C:/Users/Nathan/Documents/Work/Repos/BCP/anything-llm-fd/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import dns from "dns";
import { visualizer } from "file:///C:/Users/Nathan/Documents/Work/Repos/BCP/anything-llm-fd/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Nathan/Documents/Work/Repos/BCP/anything-llm-fd/frontend/vite.config.js";
dns.setDefaultResultOrder("verbatim");
var vite_config_default = defineConfig({
  assetsInclude: [
    "./public/piper/ort-wasm-simd-threaded.wasm",
    "./public/piper/piper_phonemize.wasm",
    "./public/piper/piper_phonemize.data"
  ],
  worker: {
    format: "es"
  },
  server: {
    port: 3e3,
    host: "localhost"
  },
  define: {
    "process.env": process.env
  },
  css: {
    postcss: postcss_config_default
  },
  plugins: [
    react(),
    visualizer({
      template: "treemap",
      // or sunburst
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "bundleinspector.html"
      // will be saved in project's root
    })
  ],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
      },
      {
        process: "process/browser",
        stream: "stream-browserify",
        zlib: "browserify-zlib",
        util: "util",
        find: /^~.+/,
        replacement: (val) => {
          return val.replace(/^~/, "");
        }
      }
    ]
  },
  build: {
    rollupOptions: {
      output: {
        // These settings ensure the primary JS and CSS file references are always index.{js,css}
        // so we can SSR the index.html as text response from server/index.js without breaking references each build.
        entryFileNames: "index.js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "index.css")
            return `index.css`;
          return assetInfo.name;
        }
      },
      external: [
        // Reduces transformation time by 50% and we don't even use this variant, so we can ignore.
        /@phosphor-icons\/react\/dist\/ssr/
      ]
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: ["@mintplex-labs/piper-tts-web"],
    esbuildOptions: {
      define: {
        global: "globalThis"
      },
      plugins: []
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAicG9zdGNzcy5jb25maWcuanMiLCAidGFpbHdpbmQuY29uZmlnLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcTmF0aGFuXFxcXERvY3VtZW50c1xcXFxXb3JrXFxcXFJlcG9zXFxcXEJDUFxcXFxhbnl0aGluZy1sbG0tZmRcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXE5hdGhhblxcXFxEb2N1bWVudHNcXFxcV29ya1xcXFxSZXBvc1xcXFxCQ1BcXFxcYW55dGhpbmctbGxtLWZkXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9OYXRoYW4vRG9jdW1lbnRzL1dvcmsvUmVwb3MvQkNQL2FueXRoaW5nLWxsbS1mZC9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gXCJ1cmxcIlxuaW1wb3J0IHBvc3Rjc3MgZnJvbSBcIi4vcG9zdGNzcy5jb25maWcuanNcIlxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiXG5pbXBvcnQgZG5zIGZyb20gXCJkbnNcIlxuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gXCJyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXJcIlxuXG5kbnMuc2V0RGVmYXVsdFJlc3VsdE9yZGVyKFwidmVyYmF0aW1cIilcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGFzc2V0c0luY2x1ZGU6IFtcbiAgICAnLi9wdWJsaWMvcGlwZXIvb3J0LXdhc20tc2ltZC10aHJlYWRlZC53YXNtJyxcbiAgICAnLi9wdWJsaWMvcGlwZXIvcGlwZXJfcGhvbmVtaXplLndhc20nLFxuICAgICcuL3B1YmxpYy9waXBlci9waXBlcl9waG9uZW1pemUuZGF0YScsXG4gIF0sXG4gIHdvcmtlcjoge1xuICAgIGZvcm1hdDogJ2VzJ1xuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIGhvc3Q6IFwibG9jYWxob3N0XCJcbiAgfSxcbiAgZGVmaW5lOiB7XG4gICAgXCJwcm9jZXNzLmVudlwiOiBwcm9jZXNzLmVudlxuICB9LFxuICBjc3M6IHtcbiAgICBwb3N0Y3NzXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHZpc3VhbGl6ZXIoe1xuICAgICAgdGVtcGxhdGU6IFwidHJlZW1hcFwiLCAvLyBvciBzdW5idXJzdFxuICAgICAgb3BlbjogZmFsc2UsXG4gICAgICBnemlwU2l6ZTogdHJ1ZSxcbiAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgICBmaWxlbmFtZTogXCJidW5kbGVpbnNwZWN0b3IuaHRtbFwiIC8vIHdpbGwgYmUgc2F2ZWQgaW4gcHJvamVjdCdzIHJvb3RcbiAgICB9KVxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IFtcbiAgICAgIHtcbiAgICAgICAgZmluZDogXCJAXCIsXG4gICAgICAgIHJlcGxhY2VtZW50OiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpKVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcHJvY2VzczogXCJwcm9jZXNzL2Jyb3dzZXJcIixcbiAgICAgICAgc3RyZWFtOiBcInN0cmVhbS1icm93c2VyaWZ5XCIsXG4gICAgICAgIHpsaWI6IFwiYnJvd3NlcmlmeS16bGliXCIsXG4gICAgICAgIHV0aWw6IFwidXRpbFwiLFxuICAgICAgICBmaW5kOiAvXn4uKy8sXG4gICAgICAgIHJlcGxhY2VtZW50OiAodmFsKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHZhbC5yZXBsYWNlKC9efi8sIFwiXCIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIC8vIFRoZXNlIHNldHRpbmdzIGVuc3VyZSB0aGUgcHJpbWFyeSBKUyBhbmQgQ1NTIGZpbGUgcmVmZXJlbmNlcyBhcmUgYWx3YXlzIGluZGV4Lntqcyxjc3N9XG4gICAgICAgIC8vIHNvIHdlIGNhbiBTU1IgdGhlIGluZGV4Lmh0bWwgYXMgdGV4dCByZXNwb25zZSBmcm9tIHNlcnZlci9pbmRleC5qcyB3aXRob3V0IGJyZWFraW5nIHJlZmVyZW5jZXMgZWFjaCBidWlsZC5cbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdpbmRleC5qcycsXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XG4gICAgICAgICAgaWYgKGFzc2V0SW5mby5uYW1lID09PSAnaW5kZXguY3NzJykgcmV0dXJuIGBpbmRleC5jc3NgO1xuICAgICAgICAgIHJldHVybiBhc3NldEluZm8ubmFtZTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBleHRlcm5hbDogW1xuICAgICAgICAvLyBSZWR1Y2VzIHRyYW5zZm9ybWF0aW9uIHRpbWUgYnkgNTAlIGFuZCB3ZSBkb24ndCBldmVuIHVzZSB0aGlzIHZhcmlhbnQsIHNvIHdlIGNhbiBpZ25vcmUuXG4gICAgICAgIC9AcGhvc3Bob3ItaWNvbnNcXC9yZWFjdFxcL2Rpc3RcXC9zc3IvLFxuICAgICAgXVxuICAgIH0sXG4gICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICB0cmFuc2Zvcm1NaXhlZEVzTW9kdWxlczogdHJ1ZVxuICAgIH1cbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1wiQG1pbnRwbGV4LWxhYnMvcGlwZXItdHRzLXdlYlwiXSxcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgZGVmaW5lOiB7XG4gICAgICAgIGdsb2JhbDogXCJnbG9iYWxUaGlzXCJcbiAgICAgIH0sXG4gICAgICBwbHVnaW5zOiBbXVxuICAgIH1cbiAgfVxufSlcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcTmF0aGFuXFxcXERvY3VtZW50c1xcXFxXb3JrXFxcXFJlcG9zXFxcXEJDUFxcXFxhbnl0aGluZy1sbG0tZmRcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXE5hdGhhblxcXFxEb2N1bWVudHNcXFxcV29ya1xcXFxSZXBvc1xcXFxCQ1BcXFxcYW55dGhpbmctbGxtLWZkXFxcXGZyb250ZW5kXFxcXHBvc3Rjc3MuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9OYXRoYW4vRG9jdW1lbnRzL1dvcmsvUmVwb3MvQkNQL2FueXRoaW5nLWxsbS1mZC9mcm9udGVuZC9wb3N0Y3NzLmNvbmZpZy5qc1wiO2ltcG9ydCB0YWlsd2luZCBmcm9tICd0YWlsd2luZGNzcydcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJ1xuaW1wb3J0IHRhaWx3aW5kQ29uZmlnIGZyb20gJy4vdGFpbHdpbmQuY29uZmlnLmpzJ1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHBsdWdpbnM6IFt0YWlsd2luZCh0YWlsd2luZENvbmZpZyksIGF1dG9wcmVmaXhlcl0sXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxOYXRoYW5cXFxcRG9jdW1lbnRzXFxcXFdvcmtcXFxcUmVwb3NcXFxcQkNQXFxcXGFueXRoaW5nLWxsbS1mZFxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcTmF0aGFuXFxcXERvY3VtZW50c1xcXFxXb3JrXFxcXFJlcG9zXFxcXEJDUFxcXFxhbnl0aGluZy1sbG0tZmRcXFxcZnJvbnRlbmRcXFxcdGFpbHdpbmQuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9OYXRoYW4vRG9jdW1lbnRzL1dvcmsvUmVwb3MvQkNQL2FueXRoaW5nLWxsbS1mZC9mcm9udGVuZC90YWlsd2luZC5jb25maWcuanNcIjsvKiogQHR5cGUge2ltcG9ydCgndGFpbHdpbmRjc3MnKS5Db25maWd9ICovXG5leHBvcnQgZGVmYXVsdCB7XG4gIGRhcmtNb2RlOiBcImNsYXNzXCIsXG4gIGNvbnRlbnQ6IHtcbiAgICByZWxhdGl2ZTogdHJ1ZSxcbiAgICBmaWxlczogW1xuICAgICAgXCIuL3NyYy9jb21wb25lbnRzLyoqLyoue2pzLGpzeH1cIixcbiAgICAgIFwiLi9zcmMvaG9va3MvKiovKi5qc1wiLFxuICAgICAgXCIuL3NyYy9tb2RlbHMvKiovKi5qc1wiLFxuICAgICAgXCIuL3NyYy9wYWdlcy8qKi8qLntqcyxqc3h9XCIsXG4gICAgICBcIi4vc3JjL3V0aWxzLyoqLyouanNcIixcbiAgICAgIFwiLi9zcmMvKi5qc3hcIixcbiAgICAgIFwiLi9pbmRleC5odG1sXCIsXG4gICAgICBcIi4vbm9kZV9tb2R1bGVzL0B0cmVtb3IvKiovKi57anMsdHMsanN4LHRzeH1cIlxuICAgIF1cbiAgfSxcbiAgdGhlbWU6IHtcbiAgICBleHRlbmQ6IHtcbiAgICAgIHJvdGF0ZToge1xuICAgICAgICBcIjI3MFwiOiBcIjI3MGRlZ1wiLFxuICAgICAgICBcIjM2MFwiOiBcIjM2MGRlZ1wiXG4gICAgICB9LFxuICAgICAgY29sb3JzOiB7XG4gICAgICAgIFwiYmxhY2stOTAwXCI6IFwiIzE0MTQxNFwiLFxuICAgICAgICBhY2NlbnQ6IFwiIzNENDE0N1wiLFxuICAgICAgICBcInNpZGViYXItYnV0dG9uXCI6IFwiIzMxMzUzQVwiLFxuICAgICAgICBzaWRlYmFyOiBcIiMyNTI3MkNcIixcbiAgICAgICAgXCJoaXN0b3JpY2FsLW1zZy1zeXN0ZW1cIjogXCJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpO1wiLFxuICAgICAgICBcImhpc3RvcmljYWwtbXNnLXVzZXJcIjogXCIjMkMyRjM1XCIsXG4gICAgICAgIG91dGxpbmU6IFwiIzRFNTE1M1wiLFxuICAgICAgICBcInByaW1hcnktYnV0dG9uXCI6IFwidmFyKC0tdGhlbWUtYnV0dG9uLXByaW1hcnkpXCIsXG4gICAgICAgIFwiY3RhLWJ1dHRvblwiOiBcInZhcigtLXRoZW1lLWJ1dHRvbi1jdGEpXCIsXG4gICAgICAgIHNlY29uZGFyeTogXCIjMkMyRjM2XCIsXG4gICAgICAgIFwiZGFyay1pbnB1dFwiOiBcIiMxODE4MUJcIixcbiAgICAgICAgXCJtb2JpbGUtb25ib2FyZGluZ1wiOiBcIiMyQzJGMzVcIixcbiAgICAgICAgXCJkYXJrLWhpZ2hsaWdodFwiOiBcIiMxQzFFMjFcIixcbiAgICAgICAgXCJkYXJrLXRleHRcIjogXCIjMjIyNjI4XCIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIiNEMkQ1REJcIixcbiAgICAgICAgXCJ4LWJ1dHRvblwiOiBcIiM5Q0EzQUZcIixcbiAgICAgICAgcm95YWxibHVlOiBcIiMwNjU5ODZcIixcbiAgICAgICAgcHVycGxlOiBcIiM0QTFGQjhcIixcbiAgICAgICAgbWFnZW50YTogXCIjOUUxNjVGXCIsXG4gICAgICAgIGRhbmdlcjogXCIjRjA0NDM4XCIsXG4gICAgICAgIGVycm9yOiBcIiNCNDIzMThcIixcbiAgICAgICAgd2FybjogXCIjODU0NzA4XCIsXG4gICAgICAgIHN1Y2Nlc3M6IFwiIzA1NjAzQVwiLFxuICAgICAgICBkYXJrZXI6IFwiI0Y0RjRGNFwiLFxuICAgICAgICB0ZWFsOiBcIiMwQkE1RUNcIixcblxuICAgICAgICAvLyBHZW5lcmljIHRoZW1lIGNvbG9yc1xuICAgICAgICB0aGVtZToge1xuICAgICAgICAgIGJnOiB7XG4gICAgICAgICAgICBwcmltYXJ5OiAndmFyKC0tdGhlbWUtYmctcHJpbWFyeSknLFxuICAgICAgICAgICAgc2Vjb25kYXJ5OiAndmFyKC0tdGhlbWUtYmctc2Vjb25kYXJ5KScsXG4gICAgICAgICAgICBzaWRlYmFyOiAndmFyKC0tdGhlbWUtYmctc2lkZWJhciknLFxuICAgICAgICAgICAgY29udGFpbmVyOiAndmFyKC0tdGhlbWUtYmctY29udGFpbmVyKScsXG4gICAgICAgICAgICBjaGF0OiAndmFyKC0tdGhlbWUtYmctY2hhdCknLFxuICAgICAgICAgICAgXCJjaGF0LWlucHV0XCI6ICd2YXIoLS10aGVtZS1iZy1jaGF0LWlucHV0KScsXG4gICAgICAgICAgICBcInBvcHVwLW1lbnVcIjogJ3ZhcigtLXRoZW1lLXBvcHVwLW1lbnUtYmcpJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRleHQ6IHtcbiAgICAgICAgICAgIHByaW1hcnk6ICd2YXIoLS10aGVtZS10ZXh0LXByaW1hcnkpJyxcbiAgICAgICAgICAgIHNlY29uZGFyeTogJ3ZhcigtLXRoZW1lLXRleHQtc2Vjb25kYXJ5KScsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogJ3ZhcigtLXRoZW1lLXBsYWNlaG9sZGVyKScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaWRlYmFyOiB7XG4gICAgICAgICAgICBpdGVtOiB7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6ICd2YXIoLS10aGVtZS1zaWRlYmFyLWl0ZW0tZGVmYXVsdCknLFxuICAgICAgICAgICAgICBzZWxlY3RlZDogJ3ZhcigtLXRoZW1lLXNpZGViYXItaXRlbS1zZWxlY3RlZCknLFxuICAgICAgICAgICAgICBob3ZlcjogJ3ZhcigtLXRoZW1lLXNpZGViYXItaXRlbS1ob3ZlciknLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Yml0ZW06IHtcbiAgICAgICAgICAgICAgZGVmYXVsdDogJ3ZhcigtLXRoZW1lLXNpZGViYXItc3ViaXRlbS1kZWZhdWx0KScsXG4gICAgICAgICAgICAgIHNlbGVjdGVkOiAndmFyKC0tdGhlbWUtc2lkZWJhci1zdWJpdGVtLXNlbGVjdGVkKScsXG4gICAgICAgICAgICAgIGhvdmVyOiAndmFyKC0tdGhlbWUtc2lkZWJhci1zdWJpdGVtLWhvdmVyKScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZm9vdGVyOiB7XG4gICAgICAgICAgICAgIGljb246ICd2YXIoLS10aGVtZS1zaWRlYmFyLWZvb3Rlci1pY29uKScsXG4gICAgICAgICAgICAgICdpY29uLWhvdmVyJzogJ3ZhcigtLXRoZW1lLXNpZGViYXItZm9vdGVyLWljb24taG92ZXIpJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBib3JkZXI6ICd2YXIoLS10aGVtZS1zaWRlYmFyLWJvcmRlciknLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjaGF0LWlucHV0XCI6IHtcbiAgICAgICAgICAgIGJvcmRlcjogJ3ZhcigtLXRoZW1lLWNoYXQtaW5wdXQtYm9yZGVyKScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImFjdGlvbi1tZW51XCI6IHtcbiAgICAgICAgICAgIGJnOiAndmFyKC0tdGhlbWUtYWN0aW9uLW1lbnUtYmcpJyxcbiAgICAgICAgICAgIFwiaXRlbS1ob3ZlclwiOiAndmFyKC0tdGhlbWUtYWN0aW9uLW1lbnUtaXRlbS1ob3ZlciknLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICAgIGJnOiAndmFyKC0tdGhlbWUtc2V0dGluZ3MtaW5wdXQtYmcpJyxcbiAgICAgICAgICAgICAgYWN0aXZlOiAndmFyKC0tdGhlbWUtc2V0dGluZ3MtaW5wdXQtYWN0aXZlKScsXG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAndmFyKC0tdGhlbWUtc2V0dGluZ3MtaW5wdXQtcGxhY2Vob2xkZXIpJyxcbiAgICAgICAgICAgICAgdGV4dDogJ3ZhcigtLXRoZW1lLXNldHRpbmdzLWlucHV0LXRleHQpJyxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG1vZGFsOiB7XG4gICAgICAgICAgICBib3JkZXI6ICd2YXIoLS10aGVtZS1tb2RhbC1ib3JkZXIpJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZmlsZS1waWNrZXJcIjoge1xuICAgICAgICAgICAgaG92ZXI6ICd2YXIoLS10aGVtZS1maWxlLXBpY2tlci1ob3ZlciknLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXR0YWNobWVudDoge1xuICAgICAgICAgICAgYmc6ICd2YXIoLS10aGVtZS1hdHRhY2htZW50LWJnKScsXG4gICAgICAgICAgICAnZXJyb3ItYmcnOiAndmFyKC0tdGhlbWUtYXR0YWNobWVudC1lcnJvci1iZyknLFxuICAgICAgICAgICAgJ3N1Y2Nlc3MtYmcnOiAndmFyKC0tdGhlbWUtYXR0YWNobWVudC1zdWNjZXNzLWJnKScsXG4gICAgICAgICAgICB0ZXh0OiAndmFyKC0tdGhlbWUtYXR0YWNobWVudC10ZXh0KScsXG4gICAgICAgICAgICAndGV4dC1zZWNvbmRhcnknOiAndmFyKC0tdGhlbWUtYXR0YWNobWVudC10ZXh0LXNlY29uZGFyeSknLFxuICAgICAgICAgICAgJ2ljb24nOiAndmFyKC0tdGhlbWUtYXR0YWNobWVudC1pY29uKScsXG4gICAgICAgICAgICAnaWNvbi1zcGlubmVyJzogJ3ZhcigtLXRoZW1lLWF0dGFjaG1lbnQtaWNvbi1zcGlubmVyKScsXG4gICAgICAgICAgICAnaWNvbi1zcGlubmVyLWJnJzogJ3ZhcigtLXRoZW1lLWF0dGFjaG1lbnQtaWNvbi1zcGlubmVyLWJnKScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBob21lOiB7XG4gICAgICAgICAgICB0ZXh0OiAndmFyKC0tdGhlbWUtaG9tZS10ZXh0KScsXG4gICAgICAgICAgICBcInRleHQtc2Vjb25kYXJ5XCI6ICd2YXIoLS10aGVtZS1ob21lLXRleHQtc2Vjb25kYXJ5KScsXG4gICAgICAgICAgICBcImJnLWNhcmRcIjogJ3ZhcigtLXRoZW1lLWhvbWUtYmctY2FyZCknLFxuICAgICAgICAgICAgXCJiZy1idXR0b25cIjogJ3ZhcigtLXRoZW1lLWhvbWUtYmctYnV0dG9uKScsXG4gICAgICAgICAgICBib3JkZXI6ICd2YXIoLS10aGVtZS1ob21lLWJvcmRlciknLFxuICAgICAgICAgICAgXCJidXR0b24tcHJpbWFyeVwiOiAndmFyKC0tdGhlbWUtaG9tZS1idXR0b24tcHJpbWFyeSknLFxuICAgICAgICAgICAgXCJidXR0b24tcHJpbWFyeS1ob3ZlclwiOiAndmFyKC0tdGhlbWUtaG9tZS1idXR0b24tcHJpbWFyeS1ob3ZlciknLFxuICAgICAgICAgICAgXCJidXR0b24tc2Vjb25kYXJ5XCI6ICd2YXIoLS10aGVtZS1ob21lLWJ1dHRvbi1zZWNvbmRhcnkpJyxcbiAgICAgICAgICAgIFwiYnV0dG9uLXNlY29uZGFyeS1ob3ZlclwiOiAndmFyKC0tdGhlbWUtaG9tZS1idXR0b24tc2Vjb25kYXJ5LWhvdmVyKScsXG4gICAgICAgICAgICBcImJ1dHRvbi1zZWNvbmRhcnktdGV4dFwiOiAndmFyKC0tdGhlbWUtaG9tZS1idXR0b24tc2Vjb25kYXJ5LXRleHQpJyxcbiAgICAgICAgICAgIFwiYnV0dG9uLXNlY29uZGFyeS1ob3Zlci10ZXh0XCI6ICd2YXIoLS10aGVtZS1ob21lLWJ1dHRvbi1zZWNvbmRhcnktaG92ZXItdGV4dCknLFxuICAgICAgICAgICAgXCJidXR0b24tc2Vjb25kYXJ5LWJvcmRlclwiOiAndmFyKC0tdGhlbWUtaG9tZS1idXR0b24tc2Vjb25kYXJ5LWJvcmRlciknLFxuICAgICAgICAgICAgXCJidXR0b24tc2Vjb25kYXJ5LWJvcmRlci1ob3ZlclwiOiAndmFyKC0tdGhlbWUtaG9tZS1idXR0b24tc2Vjb25kYXJ5LWJvcmRlci1ob3ZlciknLFxuICAgICAgICAgICAgXCJ1cGRhdGUtY2FyZC1iZ1wiOiAndmFyKC0tdGhlbWUtaG9tZS11cGRhdGUtY2FyZC1iZyknLFxuICAgICAgICAgICAgXCJ1cGRhdGUtY2FyZC1ob3ZlclwiOiAndmFyKC0tdGhlbWUtaG9tZS11cGRhdGUtY2FyZC1ob3ZlciknLFxuICAgICAgICAgICAgXCJ1cGRhdGUtc291cmNlXCI6ICd2YXIoLS10aGVtZS1ob21lLXVwZGF0ZS1zb3VyY2UpJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoZWNrbGlzdDoge1xuICAgICAgICAgICAgXCJpdGVtLWJnXCI6ICd2YXIoLS10aGVtZS1jaGVja2xpc3QtaXRlbS1iZyknLFxuICAgICAgICAgICAgXCJpdGVtLWJnLWhvdmVyXCI6ICd2YXIoLS10aGVtZS1jaGVja2xpc3QtaXRlbS1iZy1ob3ZlciknLFxuICAgICAgICAgICAgXCJpdGVtLXRleHRcIjogJ3ZhcigtLXRoZW1lLWNoZWNrbGlzdC1pdGVtLXRleHQpJyxcbiAgICAgICAgICAgIFwiaXRlbS1jb21wbGV0ZWQtYmdcIjogJ3ZhcigtLXRoZW1lLWNoZWNrbGlzdC1pdGVtLWNvbXBsZXRlZC1iZyknLFxuICAgICAgICAgICAgXCJpdGVtLWNvbXBsZXRlZC10ZXh0XCI6ICd2YXIoLS10aGVtZS1jaGVja2xpc3QtaXRlbS1jb21wbGV0ZWQtdGV4dCknLFxuICAgICAgICAgICAgXCJpdGVtLWhvdmVyXCI6ICd2YXIoLS10aGVtZS1jaGVja2xpc3QtaXRlbS1ob3ZlciknLFxuICAgICAgICAgICAgXCJjaGVja2JveC1ib3JkZXJcIjogJ3ZhcigtLXRoZW1lLWNoZWNrbGlzdC1jaGVja2JveC1ib3JkZXIpJyxcbiAgICAgICAgICAgIFwiY2hlY2tib3gtZmlsbFwiOiAndmFyKC0tdGhlbWUtY2hlY2tsaXN0LWNoZWNrYm94LWZpbGwpJyxcbiAgICAgICAgICAgIFwiY2hlY2tib3gtdGV4dFwiOiAndmFyKC0tdGhlbWUtY2hlY2tsaXN0LWNoZWNrYm94LXRleHQpJyxcbiAgICAgICAgICAgIFwiYnV0dG9uLWJvcmRlclwiOiAndmFyKC0tdGhlbWUtY2hlY2tsaXN0LWJ1dHRvbi1ib3JkZXIpJyxcbiAgICAgICAgICAgIFwiYnV0dG9uLXRleHRcIjogJ3ZhcigtLXRoZW1lLWNoZWNrbGlzdC1idXR0b24tdGV4dCknLFxuICAgICAgICAgICAgXCJidXR0b24taG92ZXItYmdcIjogJ3ZhcigtLXRoZW1lLWNoZWNrbGlzdC1idXR0b24taG92ZXItYmcpJyxcbiAgICAgICAgICAgIFwiYnV0dG9uLWhvdmVyLWJvcmRlclwiOiAndmFyKC0tdGhlbWUtY2hlY2tsaXN0LWJ1dHRvbi1ob3Zlci1ib3JkZXIpJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ1dHRvbjoge1xuICAgICAgICAgICAgdGV4dDogJ3ZhcigtLXRoZW1lLWJ1dHRvbi10ZXh0KScsXG4gICAgICAgICAgICAnY29kZS1ob3Zlci10ZXh0JzogJ3ZhcigtLXRoZW1lLWJ1dHRvbi1jb2RlLWhvdmVyLXRleHQpJyxcbiAgICAgICAgICAgICdjb2RlLWhvdmVyLWJnJzogJ3ZhcigtLXRoZW1lLWJ1dHRvbi1jb2RlLWhvdmVyLWJnKScsXG4gICAgICAgICAgICAnZGlzYWJsZS1ob3Zlci10ZXh0JzogJ3ZhcigtLXRoZW1lLWJ1dHRvbi1kaXNhYmxlLWhvdmVyLXRleHQpJyxcbiAgICAgICAgICAgICdkaXNhYmxlLWhvdmVyLWJnJzogJ3ZhcigtLXRoZW1lLWJ1dHRvbi1kaXNhYmxlLWhvdmVyLWJnKScsXG4gICAgICAgICAgICAnZGVsZXRlLWhvdmVyLXRleHQnOiAndmFyKC0tdGhlbWUtYnV0dG9uLWRlbGV0ZS1ob3Zlci10ZXh0KScsXG4gICAgICAgICAgICAnZGVsZXRlLWhvdmVyLWJnJzogJ3ZhcigtLXRoZW1lLWJ1dHRvbi1kZWxldGUtaG92ZXItYmcpJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGJhY2tncm91bmRJbWFnZToge1xuICAgICAgICBcInByZWZlcmVuY2UtZ3JhZGllbnRcIjpcbiAgICAgICAgICBcImxpbmVhci1ncmFkaWVudCgxODBkZWcsICM1QTVDNjMgMCUsIHJnYmEoOTAsIDkyLCA5OSwgMC4yOCkgMTAwJSk7XCIsXG4gICAgICAgIFwiY2hhdC1tc2ctdXNlci1ncmFkaWVudFwiOlxuICAgICAgICAgIFwibGluZWFyLWdyYWRpZW50KDE4MGRlZywgIzNENDE0NyAwJSwgIzJDMkYzNSAxMDAlKTtcIixcbiAgICAgICAgXCJzZWxlY3RlZC1wcmVmZXJlbmNlLWdyYWRpZW50XCI6XG4gICAgICAgICAgXCJsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCAjMzEzMjM2IDAlLCByZ2JhKDYzLjQwLCA2NC45MCwgNzAuMTMsIDApIDEwMCUpO1wiLFxuICAgICAgICBcIm1haW4tZ3JhZGllbnRcIjogXCJsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCAjM0Q0MTQ3IDAlLCAjMkMyRjM1IDEwMCUpXCIsXG4gICAgICAgIFwibW9kYWwtZ3JhZGllbnRcIjogXCJsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCAjM0Q0MTQ3IDAlLCAjMkMyRjM1IDEwMCUpXCIsXG4gICAgICAgIFwic2lkZWJhci1ncmFkaWVudFwiOiBcImxpbmVhci1ncmFkaWVudCg5MGRlZywgIzVCNjE2QSAwJSwgIzNGNDM0QiAxMDAlKVwiLFxuICAgICAgICBcImxvZ2luLWdyYWRpZW50XCI6IFwibGluZWFyLWdyYWRpZW50KDE4MGRlZywgIzNENDE0NyAwJSwgIzJDMkYzNSAxMDAlKVwiLFxuICAgICAgICBcIm1lbnUtaXRlbS1ncmFkaWVudFwiOlxuICAgICAgICAgIFwibGluZWFyLWdyYWRpZW50KDkwZGVnLCAjM0Q0MTQ3IDAlLCAjMkMyRjM1IDEwMCUpXCIsXG4gICAgICAgIFwibWVudS1pdGVtLXNlbGVjdGVkLWdyYWRpZW50XCI6XG4gICAgICAgICAgXCJsaW5lYXItZ3JhZGllbnQoOTBkZWcsICM1QjYxNkEgMCUsICMzRjQzNEIgMTAwJSlcIixcbiAgICAgICAgXCJ3b3Jrc3BhY2UtaXRlbS1ncmFkaWVudFwiOlxuICAgICAgICAgIFwibGluZWFyLWdyYWRpZW50KDkwZGVnLCAjM0Q0MTQ3IDAlLCAjMkMyRjM1IDEwMCUpXCIsXG4gICAgICAgIFwid29ya3NwYWNlLWl0ZW0tc2VsZWN0ZWQtZ3JhZGllbnRcIjpcbiAgICAgICAgICBcImxpbmVhci1ncmFkaWVudCg5MGRlZywgIzVCNjE2QSAwJSwgIzNGNDM0QiAxMDAlKVwiLFxuICAgICAgICBcInN3aXRjaC1zZWxlY3RlZFwiOiBcImxpbmVhci1ncmFkaWVudCgxNDZkZWcsICM1QjYxNkEgMCUsICMzRjQzNEIgMTAwJSlcIlxuICAgICAgfSxcbiAgICAgIGZvbnRGYW1pbHk6IHtcbiAgICAgICAgc2FuczogW1xuICAgICAgICAgIFwicGx1cy1qYWthcnRhLXNhbnNcIixcbiAgICAgICAgICBcInVpLXNhbnMtc2VyaWZcIixcbiAgICAgICAgICBcInN5c3RlbS11aVwiLFxuICAgICAgICAgIFwiLWFwcGxlLXN5c3RlbVwiLFxuICAgICAgICAgIFwiQmxpbmtNYWNTeXN0ZW1Gb250XCIsXG4gICAgICAgICAgJ1wiU2Vnb2UgVUlcIicsXG4gICAgICAgICAgXCJSb2JvdG9cIixcbiAgICAgICAgICAnXCJIZWx2ZXRpY2EgTmV1ZVwiJyxcbiAgICAgICAgICBcIkFyaWFsXCIsXG4gICAgICAgICAgJ1wiTm90byBTYW5zXCInLFxuICAgICAgICAgIFwic2Fucy1zZXJpZlwiLFxuICAgICAgICAgICdcIkFwcGxlIENvbG9yIEVtb2ppXCInLFxuICAgICAgICAgICdcIlNlZ29lIFVJIEVtb2ppXCInLFxuICAgICAgICAgICdcIlNlZ29lIFVJIFN5bWJvbFwiJyxcbiAgICAgICAgICAnXCJOb3RvIENvbG9yIEVtb2ppXCInXG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICBhbmltYXRpb246IHtcbiAgICAgICAgc3dlZXA6IFwic3dlZXAgMC41cyBlYXNlLWluLW91dFwiLFxuICAgICAgICBcInB1bHNlLWdsb3dcIjogXCJwdWxzZS1nbG93IDEuNXMgaW5maW5pdGVcIixcbiAgICAgICAgJ2ZhZGUtaW4nOiAnZmFkZS1pbiAwLjNzIGVhc2Utb3V0JyxcbiAgICAgICAgJ3NsaWRlLXVwJzogJ3NsaWRlLXVwIDAuNHMgZWFzZS1vdXQgZm9yd2FyZHMnLFxuICAgICAgICAnYm91bmNlLXN1YnRsZSc6ICdib3VuY2Utc3VidGxlIDJzIGVhc2UtaW4tb3V0IGluZmluaXRlJ1xuICAgICAgfSxcbiAgICAgIGtleWZyYW1lczoge1xuICAgICAgICBzd2VlcDoge1xuICAgICAgICAgIFwiMCVcIjogeyB0cmFuc2Zvcm06IFwic2NhbGVYKDApXCIsIHRyYW5zZm9ybU9yaWdpbjogXCJib3R0b20gbGVmdFwiIH0sXG4gICAgICAgICAgXCIxMDAlXCI6IHsgdHJhbnNmb3JtOiBcInNjYWxlWCgxKVwiLCB0cmFuc2Zvcm1PcmlnaW46IFwiYm90dG9tIGxlZnRcIiB9XG4gICAgICAgIH0sXG4gICAgICAgIGZhZGVJbjoge1xuICAgICAgICAgIFwiMCVcIjogeyBvcGFjaXR5OiAwIH0sXG4gICAgICAgICAgXCIxMDAlXCI6IHsgb3BhY2l0eTogMSB9XG4gICAgICAgIH0sXG4gICAgICAgIGZhZGVPdXQ6IHtcbiAgICAgICAgICBcIjAlXCI6IHsgb3BhY2l0eTogMSB9LFxuICAgICAgICAgIFwiMTAwJVwiOiB7IG9wYWNpdHk6IDAgfVxuICAgICAgICB9LFxuICAgICAgICBcInB1bHNlLWdsb3dcIjoge1xuICAgICAgICAgIFwiMCVcIjoge1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIHRyYW5zZm9ybTogXCJzY2FsZSgxKVwiLFxuICAgICAgICAgICAgYm94U2hhZG93OiBcIjAgMCAwIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wKVwiLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBcInJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wKVwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIjUwJVwiOiB7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgdHJhbnNmb3JtOiBcInNjYWxlKDEuMSlcIixcbiAgICAgICAgICAgIGJveFNoYWRvdzogXCIwIDAgMTVweCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMilcIixcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogXCJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSlcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCIxMDAlXCI6IHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICB0cmFuc2Zvcm06IFwic2NhbGUoMSlcIixcbiAgICAgICAgICAgIGJveFNoYWRvdzogXCIwIDAgMCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMClcIixcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogXCJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMClcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2ZhZGUtaW4nOiB7XG4gICAgICAgICAgJzAlJzogeyBvcGFjaXR5OiAnMCcgfSxcbiAgICAgICAgICAnMTAwJSc6IHsgb3BhY2l0eTogJzEnIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ3NsaWRlLXVwJzoge1xuICAgICAgICAgICcwJSc6IHsgdHJhbnNmb3JtOiAndHJhbnNsYXRlWSgxMHB4KScsIG9wYWNpdHk6ICcwJyB9LFxuICAgICAgICAgICcxMDAlJzogeyB0cmFuc2Zvcm06ICd0cmFuc2xhdGVZKDApJywgb3BhY2l0eTogJzEnIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2JvdW5jZS1zdWJ0bGUnOiB7XG4gICAgICAgICAgJzAlLCAxMDAlJzogeyB0cmFuc2Zvcm06ICd0cmFuc2xhdGVZKDApJyB9LFxuICAgICAgICAgICc1MCUnOiB7IHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVkoLTJweCknIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgdmFyaWFudHM6IHtcbiAgICBleHRlbmQ6IHtcbiAgICAgIGJhY2tncm91bmRDb2xvcjogWydsaWdodCddLFxuICAgICAgdGV4dENvbG9yOiBbJ2xpZ2h0J10sXG4gICAgfVxuICB9LFxuICAvLyBSZXF1aXJlZCBmb3IgcmVjaGFydCBzdHlsZXMgdG8gc2hvdyBzaW5jZSB0aGV5IGNhbiBiZSByZW5kZXJlZCBkeW5hbWljYWxseSBhbmQgd2lsbCBiZSB0cmVlLXNoYWtlbiBpZiBub3Qgc2FmZS1saXN0ZWQuXG4gIHNhZmVsaXN0OiBbXG4gICAge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgL14oYmctKD86c2xhdGV8Z3JheXx6aW5jfG5ldXRyYWx8c3RvbmV8cmVkfG9yYW5nZXxhbWJlcnx5ZWxsb3d8bGltZXxncmVlbnxlbWVyYWxkfHRlYWx8Y3lhbnxza3l8Ymx1ZXxpbmRpZ298dmlvbGV0fHB1cnBsZXxmdWNoc2lhfHBpbmt8cm9zZSktKD86NTB8MTAwfDIwMHwzMDB8NDAwfDUwMHw2MDB8NzAwfDgwMHw5MDB8OTUwKSkkLyxcbiAgICAgIHZhcmlhbnRzOiBbXCJob3ZlclwiLCBcInVpLXNlbGVjdGVkXCJdXG4gICAgfSxcbiAgICB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvXih0ZXh0LSg/OnNsYXRlfGdyYXl8emluY3xuZXV0cmFsfHN0b25lfHJlZHxvcmFuZ2V8YW1iZXJ8eWVsbG93fGxpbWV8Z3JlZW58ZW1lcmFsZHx0ZWFsfGN5YW58c2t5fGJsdWV8aW5kaWdvfHZpb2xldHxwdXJwbGV8ZnVjaHNpYXxwaW5rfHJvc2UpLSg/OjUwfDEwMHwyMDB8MzAwfDQwMHw1MDB8NjAwfDcwMHw4MDB8OTAwfDk1MCkpJC8sXG4gICAgICB2YXJpYW50czogW1wiaG92ZXJcIiwgXCJ1aS1zZWxlY3RlZFwiXVxuICAgIH0sXG4gICAge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgL14oYm9yZGVyLSg/OnNsYXRlfGdyYXl8emluY3xuZXV0cmFsfHN0b25lfHJlZHxvcmFuZ2V8YW1iZXJ8eWVsbG93fGxpbWV8Z3JlZW58ZW1lcmFsZHx0ZWFsfGN5YW58c2t5fGJsdWV8aW5kaWdvfHZpb2xldHxwdXJwbGV8ZnVjaHNpYXxwaW5rfHJvc2UpLSg/OjUwfDEwMHwyMDB8MzAwfDQwMHw1MDB8NjAwfDcwMHw4MDB8OTAwfDk1MCkpJC8sXG4gICAgICB2YXJpYW50czogW1wiaG92ZXJcIiwgXCJ1aS1zZWxlY3RlZFwiXVxuICAgIH0sXG4gICAge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgL14ocmluZy0oPzpzbGF0ZXxncmF5fHppbmN8bmV1dHJhbHxzdG9uZXxyZWR8b3JhbmdlfGFtYmVyfHllbGxvd3xsaW1lfGdyZWVufGVtZXJhbGR8dGVhbHxjeWFufHNreXxibHVlfGluZGlnb3x2aW9sZXR8cHVycGxlfGZ1Y2hzaWF8cGlua3xyb3NlKS0oPzo1MHwxMDB8MjAwfDMwMHw0MDB8NTAwfDYwMHw3MDB8ODAwfDkwMHw5NTApKSQvXG4gICAgfSxcbiAgICB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvXihzdHJva2UtKD86c2xhdGV8Z3JheXx6aW5jfG5ldXRyYWx8c3RvbmV8cmVkfG9yYW5nZXxhbWJlcnx5ZWxsb3d8bGltZXxncmVlbnxlbWVyYWxkfHRlYWx8Y3lhbnxza3l8Ymx1ZXxpbmRpZ298dmlvbGV0fHB1cnBsZXxmdWNoc2lhfHBpbmt8cm9zZSktKD86NTB8MTAwfDIwMHwzMDB8NDAwfDUwMHw2MDB8NzAwfDgwMHw5MDB8OTUwKSkkL1xuICAgIH0sXG4gICAge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgL14oZmlsbC0oPzpzbGF0ZXxncmF5fHppbmN8bmV1dHJhbHxzdG9uZXxyZWR8b3JhbmdlfGFtYmVyfHllbGxvd3xsaW1lfGdyZWVufGVtZXJhbGR8dGVhbHxjeWFufHNreXxibHVlfGluZGlnb3x2aW9sZXR8cHVycGxlfGZ1Y2hzaWF8cGlua3xyb3NlKS0oPzo1MHwxMDB8MjAwfDMwMHw0MDB8NTAwfDYwMHw3MDB8ODAwfDkwMHw5NTApKSQvXG4gICAgfVxuICBdLFxuICBwbHVnaW5zOiBbXG4gICAgZnVuY3Rpb24gKHsgYWRkVmFyaWFudCB9KSB7XG4gICAgICBhZGRWYXJpYW50KCdsaWdodCcsICcubGlnaHQgJicpIC8vIEFkZCB0aGUgYGxpZ2h0OmAgdmFyaWFudFxuICAgICAgYWRkVmFyaWFudCgncHdhJywgJy5wd2EgJicpIC8vIEFkZCB0aGUgYHB3YTpgIHZhcmlhbnRcbiAgICB9LFxuICBdXG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVZLFNBQVMsb0JBQW9CO0FBQ3BhLFNBQVMsZUFBZSxXQUFXOzs7QUNEMFcsT0FBTyxjQUFjO0FBQ2xhLE9BQU8sa0JBQWtCOzs7QUNBekIsSUFBTywwQkFBUTtBQUFBLEVBQ2IsVUFBVTtBQUFBLEVBQ1YsU0FBUztBQUFBLElBQ1AsVUFBVTtBQUFBLElBQ1YsT0FBTztBQUFBLE1BQ0w7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxNQUNOLFFBQVE7QUFBQSxRQUNOLE9BQU87QUFBQSxRQUNQLE9BQU87QUFBQSxNQUNUO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixhQUFhO0FBQUEsUUFDYixRQUFRO0FBQUEsUUFDUixrQkFBa0I7QUFBQSxRQUNsQixTQUFTO0FBQUEsUUFDVCx5QkFBeUI7QUFBQSxRQUN6Qix1QkFBdUI7QUFBQSxRQUN2QixTQUFTO0FBQUEsUUFDVCxrQkFBa0I7QUFBQSxRQUNsQixjQUFjO0FBQUEsUUFDZCxXQUFXO0FBQUEsUUFDWCxjQUFjO0FBQUEsUUFDZCxxQkFBcUI7QUFBQSxRQUNyQixrQkFBa0I7QUFBQSxRQUNsQixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixZQUFZO0FBQUEsUUFDWixXQUFXO0FBQUEsUUFDWCxRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsUUFDVCxRQUFRO0FBQUEsUUFDUixPQUFPO0FBQUEsUUFDUCxNQUFNO0FBQUEsUUFDTixTQUFTO0FBQUEsUUFDVCxR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
