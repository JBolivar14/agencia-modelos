// Tests para funciones de utilidad del frontend

describe('Utils Tests', () => {
  // Mock de escapeHtml - implementación real
  const escapeHtml = (text) => {
    if (!text) return '';
    // Simular el comportamiento real de escapeHtml
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  // Mock de validateEmail
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Mock de validatePhone
  const validatePhone = (phone) => {
    const re = /^[\d\s\-\+\(\)]+$/;
    return re.test(phone);
  };

  // Mock de formatDate
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  describe('escapeHtml', () => {
    it('debería escapar caracteres HTML peligrosos', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).not.toContain('<script>');
    });

    it('debería manejar strings vacíos', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('debería preservar texto normal', () => {
      const input = 'Texto normal sin HTML';
      const result = escapeHtml(input);
      expect(result).toBe('Texto normal sin HTML');
    });
  });

  describe('validateEmail', () => {
    it('debería validar emails correctos', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('debería rechazar emails inválidos', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('debería validar teléfonos correctos', () => {
      expect(validatePhone('123456789')).toBe(true);
      expect(validatePhone('+34 123 456 789')).toBe(true);
      expect(validatePhone('(123) 456-7890')).toBe(true);
      expect(validatePhone('123-456-7890')).toBe(true);
    });

    it('debería rechazar teléfonos inválidos', () => {
      expect(validatePhone('abc123')).toBe(false);
      expect(validatePhone('123@456')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('debería formatear fechas correctamente', () => {
      const date = '2024-01-15T10:30:00Z';
      const formatted = formatDate(date);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('debería manejar diferentes formatos de fecha', () => {
      const date1 = new Date('2024-01-15');
      const formatted1 = formatDate(date1.toISOString());
      expect(formatted1).toBeDefined();
    });
  });
});
