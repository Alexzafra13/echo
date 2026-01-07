/**
 * Setup Wizard Page
 *
 * First-run setup wizard (Jellyfin-style):
 * 1. Create admin account
 * 2. Select music library folder
 * 3. Complete setup
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Lock,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Check,
  Music,
  AlertCircle,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { Button, Input } from '@shared/components/ui';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import {
  getSetupStatus,
  createAdmin,
  configureLibrary,
  browseDirectories,
  completeSetup,
  type SetupStatus,
  type BrowseResult,
} from '../../api/setup.api';
import styles from './SetupWizard.module.css';

// Validation schemas
const adminSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type AdminFormData = z.infer<typeof adminSchema>;

type WizardStep = 'loading' | 'admin' | 'library' | 'complete' | 'done';

export default function SetupWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<WizardStep>('loading');
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Library browser state
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('/');
  const [libraryValidation, setLibraryValidation] = useState<{
    valid: boolean;
    message: string;
    fileCount?: number;
  } | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);

  // Admin form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
  });

  // Check setup status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const checkStatus = async () => {
    try {
      const setupStatus = await getSetupStatus();
      setStatus(setupStatus);

      // If setup is not needed (completed AND has admin), redirect to login
      if (!setupStatus.needsSetup) {
        setLocation('/login');
        return;
      }

      // Determine starting step based on what's missing
      if (!setupStatus.hasAdmin) {
        setStep('admin');
      } else if (!setupStatus.hasMusicLibrary) {
        setStep('library');
        loadDirectory('/');
      } else {
        setStep('complete');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
      setStep('admin');
    }
  };

  const loadDirectory = async (path: string) => {
    setIsBrowsing(true);
    try {
      const result = await browseDirectories(path);
      setBrowseData(result);
      setSelectedPath(result.currentPath);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Error al explorar directorios'));
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleAdminSubmit = async (data: AdminFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await createAdmin({
        username: data.username,
        password: data.password,
      });
      setStep('library');
      loadDirectory('/');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Error al crear la cuenta de administrador'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectLibrary = async (path: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await configureLibrary(path);
      setLibraryValidation(result);
      if (result.valid) {
        setSelectedPath(path);
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Error al validar la biblioteca'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await completeSetup();
      setStep('done');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Error al completar la configuración'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    setLocation('/login');
  };

  // Render loading state
  if (step === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.content}>
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={48} />
            <p>Verificando estado del servidor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.background} />

      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <img
            src="/images/logos/echo-icon.png"
            alt="Echo"
            className={styles.logo}
          />
        </div>

        {/* Wizard Card */}
        <div className={styles.wizardCard}>
          {/* Progress indicator */}
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressStep} ${styles.active}`}
            >
              <div className={styles.stepCircle}>
                {step === 'admin' ? '1' : <Check size={16} />}
              </div>
              <span>Cuenta Admin</span>
            </div>
            <div className={styles.progressLine} />
            <div
              className={`${styles.progressStep} ${
                step === 'library' || step === 'complete' || step === 'done' ? styles.active : ''
              }`}
            >
              <div className={styles.stepCircle}>
                {step === 'library' ? '2' : step === 'complete' || step === 'done' ? <Check size={16} /> : '2'}
              </div>
              <span>Biblioteca</span>
            </div>
            <div className={styles.progressLine} />
            <div
              className={`${styles.progressStep} ${step === 'complete' || step === 'done' ? styles.active : ''}`}
            >
              <div className={styles.stepCircle}>
                {step === 'done' ? <Check size={16} /> : '3'}
              </div>
              <span>Finalizar</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Create Admin */}
          {step === 'admin' && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                <User size={24} />
                Crear cuenta de administrador
              </h2>
              <p className={styles.stepDescription}>
                Crea tu cuenta de administrador para gestionar Echo Music Server.
              </p>

              <form onSubmit={handleSubmit(handleAdminSubmit)} className={styles.form}>
                <Input
                  {...register('username')}
                  type="text"
                  label="Usuario"
                  placeholder="admin"
                  error={errors.username?.message}
                  leftIcon={<User size={20} />}
                  autoComplete="username"
                />

                <Input
                  {...register('password')}
                  type="password"
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  error={errors.password?.message}
                  leftIcon={<Lock size={20} />}
                  autoComplete="new-password"
                />

                <Input
                  {...register('confirmPassword')}
                  type="password"
                  label="Confirmar contraseña"
                  placeholder="Repite la contraseña"
                  error={errors.confirmPassword?.message}
                  leftIcon={<Lock size={20} />}
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isSubmitting}
                  rightIcon={<ChevronRight size={20} />}
                >
                  Siguiente
                </Button>
              </form>
            </div>
          )}

          {/* Step 2: Select Library (Jellyfin-style browser) */}
          {step === 'library' && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                <FolderOpen size={24} />
                Selecciona tu biblioteca de música
              </h2>
              <p className={styles.stepDescription}>
                Navega y selecciona la carpeta donde tienes tu colección de música.
              </p>

              {/* Quick select if music was auto-detected */}
              {status?.mountedLibrary.fileCount && status.mountedLibrary.fileCount > 0 && !libraryValidation && (
                <div className={`${styles.validationResult} ${styles.valid}`}>
                  <Music size={18} />
                  <div className={styles.quickSelectContent}>
                    <span>
                      <strong>{status.mountedLibrary.fileCount.toLocaleString()}</strong> archivos encontrados en <code>{status.mountedLibrary.path}</code>
                    </span>
                    <Button
                      onClick={() => handleSelectLibrary(status.mountedLibrary.path)}
                      variant="outline"
                      size="sm"
                      loading={isSubmitting}
                    >
                      Usar esta
                    </Button>
                  </div>
                </div>
              )}

              {/* Directory browser - Always visible */}
              <div className={styles.browser}>
                {isBrowsing ? (
                  <div className={styles.browserLoading}>
                    <Loader2 className={styles.spinner} size={24} />
                    <span>Cargando...</span>
                  </div>
                ) : browseData ? (
                  <>
                    {/* Current path */}
                    <div className={styles.currentPath}>
                      <HardDrive size={18} />
                      <code>{browseData.currentPath}</code>
                      <Button
                        onClick={() => handleSelectLibrary(browseData.currentPath)}
                        variant="primary"
                        size="sm"
                        disabled={isSubmitting}
                      >
                        Usar esta carpeta
                      </Button>
                    </div>

                    {/* Go up button */}
                    {browseData.canGoUp && (
                      <button
                        className={styles.directoryItem}
                        onClick={() => browseData.parentPath && loadDirectory(browseData.parentPath)}
                        disabled={isBrowsing}
                      >
                        <ChevronLeft size={16} />
                        <FolderOpen size={18} />
                        <span>..</span>
                      </button>
                    )}

                    {/* Directory list */}
                    <div className={styles.directoryList}>
                      {browseData.directories.length === 0 ? (
                        <div className={styles.emptyDirectory}>
                          No hay subdirectorios
                        </div>
                      ) : (
                        browseData.directories.map((dir) => (
                          <div key={dir.path} className={styles.directoryRow}>
                            <button
                              className={`${styles.directoryItem} ${!dir.readable ? styles.disabled : ''}`}
                              onClick={() => dir.readable && loadDirectory(dir.path)}
                              disabled={!dir.readable || isBrowsing}
                            >
                              <ChevronRight size={16} />
                              <FolderOpen size={18} />
                              <span>{dir.name}</span>
                              {dir.hasMusic && <Music size={14} className={styles.musicIcon} />}
                            </button>
                            <Button
                              onClick={() => handleSelectLibrary(dir.path)}
                              variant="outline"
                              size="sm"
                              disabled={!dir.readable || isSubmitting}
                            >
                              Seleccionar
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : !status?.mountedLibrary.isMounted ? (
                  /* No folders mounted - show help */
                  <div className={styles.instructionsBox}>
                    <h4>No se encontraron carpetas accesibles</h4>
                    <p>Por defecto, Echo tiene acceso a <code>/mnt</code> y <code>/media</code>.</p>
                    <p>Si tu música está en otra ubicación, añade esto a tu <code>docker-compose.yml</code>:</p>
                    <pre>volumes:{'\n'}  - /tu/ruta/musica:/mnt/music:ro</pre>
                    <Button onClick={() => checkStatus()} variant="outline" style={{ marginTop: '12px' }}>
                      Verificar de nuevo
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => loadDirectory(status.mountedLibrary.path)} variant="outline" fullWidth>
                    Explorar carpetas
                  </Button>
                )}
              </div>

              {/* Validation result */}
              {libraryValidation && (
                <div
                  className={`${styles.validationResult} ${
                    libraryValidation.valid ? styles.valid : styles.invalid
                  }`}
                >
                  {libraryValidation.valid ? <Check size={18} /> : <AlertCircle size={18} />}
                  <span>{libraryValidation.message}</span>
                </div>
              )}

              {/* Next button */}
              {libraryValidation?.valid && (
                <div className={styles.actions}>
                  <Button
                    onClick={() => setStep('complete')}
                    variant="primary"
                    size="lg"
                    fullWidth
                    rightIcon={<ChevronRight size={20} />}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                <Check size={24} />
                ¡Casi listo!
              </h2>
              <p className={styles.stepDescription}>
                Revisa la configuración y completa la instalación.
              </p>

              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <User size={20} />
                  <span>Cuenta de administrador creada</span>
                  <Check size={18} className={styles.checkIcon} />
                </div>
                <div className={styles.summaryItem}>
                  <FolderOpen size={20} />
                  <span>Biblioteca: {selectedPath || status?.musicLibraryPath}</span>
                  <Check size={18} className={styles.checkIcon} />
                </div>
              </div>

              <Button
                onClick={handleCompleteSetup}
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                rightIcon={<Check size={20} />}
              >
                Completar configuración
              </Button>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className={styles.stepContent}>
              <div className={styles.successIcon}>
                <Check size={48} />
              </div>
              <h2 className={styles.stepTitle}>¡Configuración completada!</h2>
              <p className={styles.stepDescription}>
                Echo Music Server está listo para usar. Inicia sesión con tu cuenta de administrador.
              </p>

              <Button
                onClick={handleGoToLogin}
                variant="primary"
                size="lg"
                fullWidth
                rightIcon={<ChevronRight size={20} />}
              >
                Ir al inicio de sesión
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
