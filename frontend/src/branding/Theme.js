import { createTheme } from "@mui/material/styles";

// This theme object was constructed from the original using adaptV4Theme.
// once it had run I dumped the updated object to the console and then
// pasted it back in here, removing the need for adaptV4Theme to be
// called at all. It also means we can see exactly what is being used.
export const Theme = createTheme({
    "breakpoints": {
      "values": {
        "xs": 0,
        "sm": 600,
        "md": 960,
        "lg": 1450,
        "xl": 1920
      }
    },
    "typography": {
      "useNextVariants": "true"
    },
    "components": {
      "MuiButton": {
        "styleOverrides": {
          "containedPrimary": {
            "color": "white"
          }
        }
      },
      "MuiIcon": {
        "styleOverrides": {
          "root": {
            "overflow": "visible"
          }
        }
      },
      "MuiCardHeader": {
        "styleOverrides": {
          "root": {
            "backgroundColor": "#4e954b"
          },
          "title": {
            "color": "white",
            "fontSize": 20,
            "fontweight": 500
          }
        }
      }
    },
    "mixins": {},
    "palette": {
      "text": {
        "hint": "rgba(0, 0, 0, 0.38)"
      },
      "mode": "light",
      "type": "light",
      "primary": {
        "light": "#5cdbe6",
        "main": "#4e954b",
        "dark": "#007984",
        "contrastText": "#fff"
      },
      "secondary": {
        "main": "#d2a030",
        "contrastText": "#fff"
      },
      "error": {
        "main": "rgb(198,57,59)"
      }
    }
  });
