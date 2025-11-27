const {
  isValidName,
  validatePassword
} = require('../scripts/utils');

describe('AuthUtils', () => {
  test('isValidName принимает буквы и отклоняет цифры/символы', () => {
    expect(isValidName('Иван Петров')).toBe(true);
    expect(isValidName("O'Connor")).toBe(true);
    expect(isValidName('A')).toBe(false);
    expect(isValidName('John123')).toBe(false);
    expect(isValidName('@@')).toBe(false);
  });

  test('validatePassword применяет все три требования', () => {
    const weak = validatePassword('short1');
    expect(weak.isValid).toBe(false);
    expect(weak.strength).toBe('weak');

    const strong = validatePassword('Strong#123');
    expect(strong.isValid).toBe(true);
    expect(strong.strength).toBe('strong');
    expect(strong.requirements).toMatchObject({
      length: true,
      number: true,
      special: true
    });
  });
});

