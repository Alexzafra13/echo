import { PasswordUtil } from './password.util';

describe('PasswordUtil', () => {
  describe('generateTemporaryPassword', () => {
    it('debería generar una contraseña de exactamente 8 caracteres', () => {
      // Act
      const password = PasswordUtil.generateTemporaryPassword();

      // Assert
      expect(password).toHaveLength(8);
    });

    it('debería generar solo caracteres alfanuméricos', () => {
      // Act
      const password = PasswordUtil.generateTemporaryPassword();

      // Assert
      expect(password).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('debería contener al menos una letra mayúscula', () => {
      // Act
      const passwords = Array.from({ length: 10 }, () =>
        PasswordUtil.generateTemporaryPassword()
      );

      // Assert
      // Al menos una de las 10 contraseñas debe tener mayúscula
      // (estadísticamente debería tener todas, pero por seguridad verificamos que al menos 1)
      const hasUpperCase = passwords.some((pwd) => /[A-Z]/.test(pwd));
      expect(hasUpperCase).toBe(true);

      // Verificar que cada contraseña individual tiene formato correcto
      passwords.forEach((pwd) => {
        expect(pwd).toMatch(/^[A-Za-z0-9]{8}$/);
      });
    });

    it('debería contener al menos una letra minúscula', () => {
      // Act
      const passwords = Array.from({ length: 10 }, () =>
        PasswordUtil.generateTemporaryPassword()
      );

      // Assert
      const hasLowerCase = passwords.some((pwd) => /[a-z]/.test(pwd));
      expect(hasLowerCase).toBe(true);
    });

    it('debería contener al menos un número', () => {
      // Act
      const passwords = Array.from({ length: 10 }, () =>
        PasswordUtil.generateTemporaryPassword()
      );

      // Assert
      const hasNumber = passwords.some((pwd) => /[0-9]/.test(pwd));
      expect(hasNumber).toBe(true);
    });

    it('NO debería contener caracteres confusos (I, O, l, 0, 1)', () => {
      // Act - Generar 100 contraseñas para tener alta confianza
      const passwords = Array.from({ length: 100 }, () =>
        PasswordUtil.generateTemporaryPassword()
      );

      // Assert
      passwords.forEach((pwd) => {
        expect(pwd).not.toContain('I');
        expect(pwd).not.toContain('O');
        expect(pwd).not.toContain('l');
        expect(pwd).not.toContain('0');
        expect(pwd).not.toContain('1');
      });
    });

    it('debería generar contraseñas diferentes en cada llamada', () => {
      // Act
      const password1 = PasswordUtil.generateTemporaryPassword();
      const password2 = PasswordUtil.generateTemporaryPassword();
      const password3 = PasswordUtil.generateTemporaryPassword();
      const password4 = PasswordUtil.generateTemporaryPassword();
      const password5 = PasswordUtil.generateTemporaryPassword();

      // Assert
      const passwords = [password1, password2, password3, password4, password5];
      const uniquePasswords = new Set(passwords);

      // Al menos 4 de 5 deben ser únicas (permite 1 colisión por mala suerte estadística)
      expect(uniquePasswords.size).toBeGreaterThanOrEqual(4);
    });

    it('debería generar contraseñas con alta entropía (100 contraseñas únicas)', () => {
      // Act - Generar 100 contraseñas
      const passwords = Array.from({ length: 100 }, () =>
        PasswordUtil.generateTemporaryPassword()
      );

      // Assert
      const uniquePasswords = new Set(passwords);

      // Esperamos al menos 95 contraseñas únicas de 100
      // (permite algunas colisiones raras pero verifica que no hay patrón)
      expect(uniquePasswords.size).toBeGreaterThanOrEqual(95);
    });

    it('debería tener la estructura esperada: 1 mayúscula + 1 minúscula + 1 número + 5 aleatorios', () => {
      // Act - Generar varias contraseñas y verificar que todas cumplan
      const passwords = Array.from({ length: 50 }, () =>
        PasswordUtil.generateTemporaryPassword()
      );

      // Assert
      passwords.forEach((pwd) => {
        // Debe tener 8 caracteres
        expect(pwd).toHaveLength(8);

        // Debe tener al menos 1 mayúscula, 1 minúscula, 1 número
        expect(/[A-Z]/.test(pwd)).toBe(true);
        expect(/[a-z]/.test(pwd)).toBe(true);
        expect(/[0-9]/.test(pwd)).toBe(true);

        // Solo caracteres válidos
        expect(/^[A-Za-z0-9]+$/.test(pwd)).toBe(true);
      });
    });

    it('debería usar solo caracteres seguros (sin I, O, l, o, 0, 1)', () => {
      // Definir el conjunto de caracteres permitidos según la implementación
      const allowedUppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I, O
      const allowedLowercase = 'abcdefghjkmnpqrstuvwxyz'; // Sin i, l, o
      const allowedNumbers = '23456789'; // Sin 0, 1

      // Act
      const passwords = Array.from({ length: 100 }, () =>
        PasswordUtil.generateTemporaryPassword()
      );

      // Assert
      passwords.forEach((pwd) => {
        for (const char of pwd) {
          const isAllowed =
            allowedUppercase.includes(char) ||
            allowedLowercase.includes(char) ||
            allowedNumbers.includes(char);

          expect(isAllowed).toBe(true);
        }
      });
    });

    it('debería mantener consistencia en el formato: alfanumérico de 8 caracteres', () => {
      // Act - Generar muchas contraseñas
      const passwords = Array.from({ length: 200 }, () =>
        PasswordUtil.generateTemporaryPassword()
      );

      // Assert - Todas deben cumplir el mismo formato
      const regex = /^[A-Za-z0-9]{8}$/;
      passwords.forEach((pwd, index) => {
        expect(pwd).toMatch(regex);
        expect(pwd).toHaveLength(8);
      });
    });
  });
});
