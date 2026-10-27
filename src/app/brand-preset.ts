import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Paleta:
 *  #202923 fondo página         (surface.950)
 *  #303A34 superficies/tarjetas (surface.900)
 *  #39765B primario
 *  #70B68A acento
 *  #F0F3EF texto                (surface.0)
 */
export const BrandPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#EAF5EE', 100: '#D2EADB', 200: '#B3DCC3', 300: '#92CBA7',
      400: '#70B68A', 500: '#39765B', 600: '#2F6249', 700: '#264E3B',
      800: '#1D3B2D', 900: '#152A20', 950: '#0D1A14',
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#F0F3EF', 50: '#E1E6E0', 100: '#CDD4CD', 200: '#B2BCB4',
          300: '#96A29A', 400: '#7A887F', 500: '#5F6D64', 600: '#55645A',
          700: '#46544B', 800: '#3B4840', 900: '#303A34', 950: '#202923',
        },
        primary: {
          color: '{primary.500}',
          contrastColor: '#F0F3EF',
          hoverColor: '#43876A',
          activeColor: '#4C9876',
        },
        highlight: {
          background: '{primary.500}',
          focusBackground: '{primary.600}',
          color: '#F0F3EF',
          focusColor: '#F0F3EF',
        },
      },
    },
  },
});
