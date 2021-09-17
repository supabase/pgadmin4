/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* The complete styling file for Material-UI components used
 * This will become the main theme file for pgAdmin. All the
 * custom themes info will come here.
 */

import React, { useMemo } from 'react';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import CustomPropTypes from '../custom_prop_types';

import getStandardTheme from './standard';
import getDarkTheme from './dark';
import getHightContrastTheme from './high_contrast';

/* Common settings across all themes */
let basicSettings = createMuiTheme();
basicSettings = createMuiTheme(basicSettings, {
  typography: {
    fontSize: 14,
    htmlFontSize: 14,
  },
  shape: {
    borderRadius: 4,
  },
  overrides: {
    MuiTabs: {
      root: {
        minHeight: 0,
      }
    },
    PrivateTabIndicator: {
      root: {
        height: '3px',
        transition: basicSettings.transitions.create(['all'], {duration: '150ms'}),
      }
    },
    MuiTab: {
      root: {
        textTransform: 'none',
        minHeight: 0,
        padding: '5px 10px',
        [basicSettings.breakpoints.up('xs')]: {
          minWidth: 0,
        },
        [basicSettings.breakpoints.up('sm')]: {
          minWidth: 0,
        },
        [basicSettings.breakpoints.up('md')]: {
          minWidth: 0,
        },
        [basicSettings.breakpoints.up('lg')]: {
          minWidth: 0,
        },
      },
      textColorInherit: {
        textTransform: 'none',
        opacity: 1,
      }
    },
    MuiButton: {
      root: {
        textTransform: 'none,',
        padding: basicSettings.spacing(0.5, 1.5),
        '&.Mui-disabled': {
          opacity: 0.65,
        }
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        }
      },
      outlined: {
        padding: basicSettings.spacing(0.375, 1),
      },
      startIcon: {
        marginRight: basicSettings.spacing(0.5),
      }
    },
    MuiOutlinedInput: {
      multiline: {
        padding: '0px',
      },
      input: {
        padding: basicSettings.spacing(0.75, 1.5),
        borderRadius: 'inherit',
      },
      inputMultiline: {
        padding: basicSettings.spacing(0.75, 1.5),
      },
      adornedEnd: {
        paddingRight: basicSettings.spacing(1.5),
      }
    },
    MuiToggleButton: {
      root: {
        textTransform: 'none,',
        padding: basicSettings.spacing(0.5, 2.5, 0.5, 0.5),
        color: 'abc',
        '&:hover':{
          backgroundColor: 'abc',
        },
        '&$selected': {
          color: 'abc',
          backgroundColor: 'abc',
          '&:hover':{
            backgroundColor: 'abc',
          }
        }
      }
    },
    MuiAccordion: {
      root: {
        boxShadow: 'none',
      }
    },
    MuiAccordionSummary: {
      root: {
        minHeight: 0,
        '&.Mui-expanded': {
          minHeight: 0,
        },
        padding: basicSettings.spacing(0, 1),
        fontWeight: basicSettings.typography.fontWeightBold,
      },
      content: {
        margin: basicSettings.spacing(1),
        '&.Mui-expanded': {
          margin: basicSettings.spacing(1),
        }
      },
      expandIcon: {
        order: -1,
      }
    },
    MuiAccordionDetails: {
      root: {
        padding: basicSettings.spacing(1),
      }
    },
    MuiFormControlLabel: {
      root: {
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      }
    },
    MuiFormHelperText: {
      root: {
        fontSize: '1em',
      }
    },
    MuiTypography: {
      body1: {
        fontSize: '1em',
      }
    }
  },
  transitions: {
    duration: {
      shortest: 50,
      shorter: 100,
      short: 150,
      standard: 200,
      complex: 175,
      enteringScreen: 125,
      leavingScreen: 95,
    }
  },
  props: {
    MuiTextField: {
      variant: 'outlined',
    },
    MuiButton: {
      disableTouchRipple: true,
    },
    MuiIconButton: {
      size: 'small',
      disableTouchRipple: true,
    },
    MuiAccordion: {
      defaultExpanded: true,
    },
    MuiTab: {
      textColor: 'inherit',
    }
  },
});

/* Get the final theme after merging base theme with selected theme */
function getFinalTheme(baseTheme) {
  let mixins = {
    panelBorder: {
      border: '1px solid '+baseTheme.otherVars.borderColor,
      top: {
        borderTop: '1px solid '+baseTheme.otherVars.borderColor,
      },
      bottom: {
        borderBottom: '1px solid '+baseTheme.otherVars.borderColor,
      },
      right: {
        borderRight: '1px solid '+baseTheme.otherVars.borderColor,
      }
    },
    nodeIcon: {
      backgroundPosition: 'center',
      padding: baseTheme.spacing(0, 1.5),
    }
  };

  return createMuiTheme({
    mixins: mixins,
    overrides: {
      MuiOutlinedInput:  {
        notchedOutline: {
          borderColor: baseTheme.otherVars.inputBorderColor,
        }
      },
      MuiTabs: {
        root: {
          backgroundColor: baseTheme.otherVars.headerBg,
          ...mixins.panelBorder.bottom
        },
        indicator: {
          backgroundColor: baseTheme.otherVars.activeColor,
        }
      },
      MuiFormLabel: {
        root: {
          color: baseTheme.palette.text.primary,
          fontSize: baseTheme.typography.fontSize,
        },
        asterisk: {
          color: baseTheme.palette.error.main,
        }
      },
      MuiInputBase: {
        root: {
          backgroundColor: baseTheme.palette.background.default,
        },
        inputMultiline: {
          fontSize: baseTheme.typography.fontSize,
          height: 'unset',
          backgroundColor: baseTheme.palette.background.default,
          '&[readonly]': {
            backgroundColor: baseTheme.palette.inputDisabledBg,
          }
        },
        input: {
          fontSize: baseTheme.typography.fontSize,
          height: 'unset',
          backgroundColor: baseTheme.palette.background.default,
          '&[readonly]': {
            backgroundColor: baseTheme.otherVars.inputDisabledBg,
          }
        }
      },
      MuiIconButton: {
        root: {
          color: baseTheme.palette.text.primary,
        }
      },
      MuiAccordion: {
        root: {
          ...mixins.panelBorder,
        }
      },
      MuiAccordionSummary: {
        root: {
          ...mixins.panelBorder.bottom,
          backgroundColor: baseTheme.otherVars.headerBg,
        }
      },
      MuiSwitch: {
        root: {
          width: 54,
          height: 28,
          padding: '7px 12px',
        },
        switchBase: {
          padding: baseTheme.spacing(0.5),
          '&.Mui-checked': {
            color: baseTheme.palette.success.main,
            transform: 'translateX(24px)',
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: baseTheme.palette.success.light,
          },
        },
      },
      MuiCheckbox: {
        root: {
          padding: '0px',
          color: baseTheme.otherVars.inputBorderColor,
        }
      },
      MuiToggleButton: {
        root: {
          paddingRight: baseTheme.spacing(2.5),
          paddingLeft: baseTheme.spacing(0.5),
          color: 'abc',
          '&:hover':{
            backgroundColor: 'abc',
          },
          '&$selected': {
            color: 'abc',
            backgroundColor: 'abc',
            '&:hover':{
              backgroundColor: 'abc',
            }
          }
        }
      },
    }
  }, baseTheme);
}

/* Theme wrapper used by DOM containers to apply theme */
/* In future, this will be moved to App container */
export default function Theme(props) {
  const theme = useMemo(()=>{
    /* We'll remove this in future, we can get the value from preferences directly */
    let themeName = document.querySelector('link[data-theme]')?.getAttribute('data-theme');
    let baseTheme = getStandardTheme(basicSettings);
    switch(themeName) {
    case 'dark':
      baseTheme = getDarkTheme(baseTheme);
      break;
    case 'high_contrast':
      baseTheme = getHightContrastTheme(baseTheme);
      break;
    }
    return getFinalTheme(baseTheme);
  }, []);
  return (
    <ThemeProvider theme={theme}>
      {props.children}
    </ThemeProvider>
  );
}

Theme.propTypes = {
  children: CustomPropTypes.children,
};
