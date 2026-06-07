// frontend/tests/form-validation.test.js

// ============ ТЕСТЫ ВАЛИДАЦИИ РЕГИСТРАЦИИ ============
describe('Registration Form Validation', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('should show error for empty form', () => {
    cy.get('button[type="submit"]').click();
    cy.get('.bg-red-50').should('be.visible');
  });

  it('should show error for invalid email', () => {
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('input[name="password"]').type('test123');
    cy.get('input[name="confirmPassword"]').type('test123');
    cy.get('button[type="submit"]').click();
    cy.get('.bg-red-50').should('contain', 'Неверный формат email');
  });

  it('should show error for short username (<3)', () => {
    cy.get('input[name="username"]').type('ab');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('test123');
    cy.get('input[name="confirmPassword"]').type('test123');
    cy.get('button[type="submit"]').click();
    cy.get('.bg-red-50').should('contain', 'Username должен быть от 3');
  });

  it('should show error for short password (<6)', () => {
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('12345');
    cy.get('input[name="confirmPassword"]').type('12345');
    cy.get('button[type="submit"]').click();
    cy.get('.bg-red-50').should('contain', 'Пароль должен быть не менее 6');
  });

  it('should show error for mismatched passwords', () => {
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('test123');
    cy.get('input[name="confirmPassword"]').type('test456');
    cy.get('button[type="submit"]').click();
    cy.get('.bg-red-50').should('contain', 'Пароли не совпадают');
  });
});

// ============ ТЕСТЫ КОММЕНТАРИЕВ ============
describe('Comment Form Validation', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('test123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.visit('/prompt/1');
  });

  it('should show error for empty comment', () => {
    cy.get('button[type="submit"]').contains('Отправить').click();
    cy.get('.bg-red-50').should('contain', 'Комментарий не может быть пустым');
  });

  it('should show error for short comment (<2 chars)', () => {
    cy.get('textarea').type('a');
    cy.get('button[type="submit"]').contains('Отправить').click();
    cy.get('.bg-red-50').should('contain', 'минимум 2 символа');
  });

  it('should show character counter', () => {
    cy.get('textarea').type('Hello world');
    cy.get('.text-xs.text-gray-400').should('contain', '/2000');
  });

  it('should not allow more than 2000 characters', () => {
    const longText = 'x'.repeat(2001);
    cy.get('textarea').type(longText);
    cy.get('button[type="submit"]').contains('Отправить').click();
    cy.get('.bg-red-50').should('contain', '2000 символов');
  });
});

// ============ ТЕСТЫ НАСТРОЕК ПРОФИЛЯ ============
describe('Profile Settings Validation', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('test123');
    cy.get('button[type="submit"]').click();
    cy.visit('/settings');
  });

  it('should show error for invalid Telegram username', () => {
    cy.get('input[name="telegram"]').type('invalid username with spaces');
    cy.get('button[type="submit"]').contains('Сохранить изменения').click();
    cy.get('.bg-red-50').should('contain', 'Telegram username должен содержать');
  });

  it('should show error for short Telegram username (<5)', () => {
    cy.get('input[name="telegram"]').type('ab');
    cy.get('button[type="submit"]').contains('Сохранить изменения').click();
    cy.get('.bg-red-50').should('contain', '5-32 символов');
  });

  it('should show error for invalid website URL', () => {
    cy.get('input[name="website"]').type('not-a-url');
    cy.get('button[type="submit"]').contains('Сохранить изменения').click();
    cy.get('.bg-red-50').should('contain', 'Введите корректный URL');
  });

  it('should show error for future birth date', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    cy.get('input[name="birth_date"]').type(dateStr);
    cy.get('button[type="submit"]').contains('Сохранить изменения').click();
    cy.get('.bg-red-50').should('contain', 'не может быть в будущем');
  });

  it('should show character counter for bio', () => {
    cy.get('textarea[name="bio"]').type('A'.repeat(100));
    cy.get('.text-xs.text-gray-400').should('contain', '100/500');
  });
});

// ============ ТЕСТЫ ВОССТАНОВЛЕНИЯ ПАРОЛЯ ============
describe('Password Reset Validation', () => {
  it('should show error for empty email', () => {
    cy.visit('/forgot-password');
    cy.get('button[type="submit"]').click();
    cy.get('input:invalid').should('exist');
  });

  it('should accept valid email and show success message', () => {
    cy.visit('/forgot-password');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('button[type="submit"]').click();
    cy.contains('Если пользователь с таким email существует').should('be.visible');
  });

  it('should show error for mismatched passwords on reset', () => {
    cy.visit('/reset-password?token=test-token');
    cy.get('input[type="password"]').first().type('newpass123');
    cy.get('input[type="password"]').last().type('different');
    cy.get('button[type="submit"]').click();
    cy.get('.bg-red-50').should('contain', 'Пароли не совпадают');
  });

  it('should show error for short new password', () => {
    cy.visit('/reset-password?token=test-token');
    cy.get('input[type="password"]').first().type('12345');
    cy.get('input[type="password"]').last().type('12345');
    cy.get('button[type="submit"]').click();
    cy.get('.bg-red-50').should('contain', 'не менее 6 символов');
  });
});

// ============ ТЕСТЫ АВАТАРКИ ============
describe('Avatar Upload Validation', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('test123');
    cy.get('button[type="submit"]').click();
    cy.visit('/dashboard');
  });

  it('should show error for non-image file', () => {
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    cy.get('input[type="file"]').attachFile(file);
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Пожалуйста, выберите изображение');
    });
  });
});

// ============ ЗАПУСК ТЕСТОВ ============
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  ТЕСТЫ ФОРМ ГОТОВЫ К ЗАПУСКУ                ║
╠══════════════════════════════════════════════════════════════╣
║  Запуск: npm test или yarn test                              ║
║  Для бэкенда: python backend/tests/test_forms.py             ║
╚══════════════════════════════════════════════════════════════╝
`);