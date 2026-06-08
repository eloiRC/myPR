import { describe, it, expect } from 'vitest';
import { signup, login, novaSerie, editSerie, nouExercici, editExercici, editEntreno, getEntrenos } from '../schema';

describe('Schema validation', () => {
  describe('signup / login', () => {
    it('should accept valid credentials', () => {
      const result = signup.parse({ email: 'test@example.com', password: 'Password1' });
      expect(result.email).toBe('test@example.com');
    });

    it('should reject password without letter', () => {
      expect(() => signup.parse({ email: 'test@example.com', password: '12345678' })).toThrow();
    });

    it('should reject password without number', () => {
      expect(() => signup.parse({ email: 'test@example.com', password: 'abcdefgh' })).toThrow();
    });

    it('should reject short password', () => {
      expect(() => signup.parse({ email: 'test@example.com', password: 'Ab1' })).toThrow();
    });

    it('should reject invalid email', () => {
      expect(() => login.parse({ email: 'not-email', password: 'Password1' })).toThrow();
    });
  });

  describe('novaSerie', () => {
    it('should accept valid serie', () => {
      const result = novaSerie.parse({ entrenoId: 1, exerciciId: 1, kg: 20, reps: 10 });
      expect(result.kg).toBe(20);
      expect(result.reps).toBe(10);
    });

    it('should reject zero kg', () => {
      expect(() => novaSerie.parse({ entrenoId: 1, exerciciId: 1, kg: 0, reps: 10 })).toThrow();
    });

    it('should reject negative reps', () => {
      expect(() => novaSerie.parse({ entrenoId: 1, exerciciId: 1, kg: 20, reps: -1 })).toThrow();
    });

    it('should reject non-integer reps', () => {
      expect(() => novaSerie.parse({ entrenoId: 1, exerciciId: 1, kg: 20, reps: 10.5 })).toThrow();
    });
  });

  describe('editSerie', () => {
    it('should accept valid edit', () => {
      const result = editSerie.parse({ serieId: 1, entrenoId: 1, exerciciId: 1, kg: 30, reps: 8 });
      expect(result.kg).toBe(30);
    });
  });

  describe('nouExercici', () => {
    it('should accept valid exercise', () => {
      const result = nouExercici.parse({ nom: 'Press Banca', grupsMusculars: [1, 2] });
      expect(result.nom).toBe('Press Banca');
    });

    it('should reject empty name', () => {
      expect(() => nouExercici.parse({ nom: 'ab', grupsMusculars: [1] })).toThrow();
    });

    it('should reject more than 5 muscle groups', () => {
      expect(() => nouExercici.parse({ nom: 'Test', grupsMusculars: [1, 2, 3, 4, 5, 6] })).toThrow();
    });

    it('should reject negative muscle group ids', () => {
      expect(() => nouExercici.parse({ nom: 'Test', grupsMusculars: [-1] })).toThrow();
    });
  });

  describe('editEntreno', () => {
    it('should accept minimal edit with only entrenoId', () => {
      const result = editEntreno.parse({ entrenoId: 1 });
      expect(result.entrenoId).toBe(1);
    });

    it('should accept full edit', () => {
      const result = editEntreno.parse({ entrenoId: 1, nom: 'New Name', descripcio: 'Desc', puntuacio: 4 });
      expect(result.nom).toBe('New Name');
    });
  });

  describe('getEntrenos', () => {
    it('should reject when dataFi < dataInici', () => {
      expect(() => getEntrenos.parse({ dataInici: 2000000000, dataFi: 1800000000 })).toThrow();
    });

    it('should accept valid date range', () => {
      const result = getEntrenos.parse({ dataInici: 1800000000, dataFi: 2000000000 });
      expect(result.dataInici).toBe(1800000000);
    });
  });
});
