import { describe, expect, it } from 'vitest';
import { fecha, hora, iniciales, numero } from '../../src/logica/formato.ts';

describe('formato de horas, fechas, números e iniciales', () => {
  it('hora y fecha con dos dígitos', () => {
    const d = new Date(2026, 0, 5, 7, 3);
    expect(hora(d)).toBe('07:03');
    expect(fecha(d)).toBe('05/01/2026');
  });
  it('números con separador de miles', () => {
    expect(numero(1250)).toBe('1,250');
    expect(numero('80')).toBe('80');
  });
  it('iniciales del nombre (o del correo, sin el dominio)', () => {
    expect(iniciales('Persona de Prueba')).toBe('PD');
    expect(iniciales('luis.rojas@aic.pe')).toBe('LR');
    expect(iniciales('ana@aic.pe')).toBe('A');
    expect(iniciales('')).toBe('?');
  });
});
