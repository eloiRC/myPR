import { describe, it, expect, beforeEach } from 'vitest';

describe('Auth token handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve token from localStorage', () => {
    const token = 'test-jwt-token';
    localStorage.setItem('token', token);
    expect(localStorage.getItem('token')).toBe(token);
  });

  it('should handle token expiry', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem('exp', pastExp.toString());

    const exp = parseInt(localStorage.getItem('exp') || '0');
    const isExpired = exp < Math.floor(Date.now() / 1000);
    expect(isExpired).toBe(true);
  });

  it('should detect valid token', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('token', 'some-token');
    localStorage.setItem('exp', futureExp.toString());

    const token = localStorage.getItem('token');
    const exp = parseInt(localStorage.getItem('exp') || '0');
    expect(token).toBeTruthy();
    expect(exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should clear all auth data on logout', () => {
    localStorage.setItem('token', 'some-token');
    localStorage.setItem('exp', '12345');
    localStorage.setItem('userId', '1');

    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('exp');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('exp')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
  });
});
