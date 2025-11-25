/**
 * Setup Wizard Page
 *
 * First-run setup wizard (Jellyfin-style):
 * 1. Create admin account
 * 2. Select music library folder
 * 3. Complete setup
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Lock,
  Mail,
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
  email: z.string().email('Email inválido').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type AdminFormData = z.infer<typeof adminSchema>;

type WizardStep = 'loading' | 'admin' | 'library' | 'complete' | 'done';

export default function SetupWizard() {
  const navigate = useNavigate();
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

  const checkStatus = async () => {
    try {
      const setupStatus = await getSetupStatus();
      setStatus(setupStatus);

      if (setupStatus.setupCompleted) {
        navigate('/login');
        return;
      }

      // Determine starting step
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al explorar directorios');
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
        email: data.email || undefined,
      });
      setStep('library');
      loadDirectory('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear la cuenta de administrador');
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al validar la biblioteca');
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al completar la configuración');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
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
              className={`${styles.progressStep} ${step !== 'loading' ? styles.active : ''}`}
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
                  {...register('email')}
                  type="email"
                  label="Email (opcional)"
                  placeholder="admin@example.com"
                  error={errors.email?.message}
                  leftIcon={<Mail size={20} />}
                  autoComplete="email"
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

          {/* Step 2: Select Library */}
          {step === 'library' && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                <FolderOpen size={24} />
                Biblioteca de música
              </h2>

              {/* Case 1: Library mounted with content (Jellyfin-style) */}
              {status?.mountedLibrary.isMounted && status?.mountedLibrary.hasContent ? (
                <>
                  <p className={styles.stepDescription}>
                    Se ha detectado tu biblioteca de música montada en el servidor.
                  </p>

                  <div className={`${styles.validationResult} ${styles.valid}`}>
                    <Music size={18} />
                    <span>
                      <strong>{status.mountedLibrary.fileCount.toLocaleString()}</strong> archivos de música encontrados en <code>{status.mountedLibrary.path}</code>
                    </span>
                  </div>

                  <div className={styles.actions}>
                    <Button
                      onClick={() => handleSelectLibrary(status.mountedLibrary.path)}
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={isSubmitting}
                      rightIcon={<ChevronRight size={20} />}
                    >
                      Usar esta biblioteca
                    </Button>
                  </div>

                  {/* Optional: Show browser for advanced users */}
                  <details className={styles.advancedOptions}>
                    <summary>Opciones avanzadas</summary>
                    <p className={styles.advancedText}>
                      Si quieres seleccionar una subcarpeta específica, puedes navegar aquí:
                    </p>

                    {/* Directory browser */}
                    <div className={styles.browser}>
                      {browseData ? (
                        <>
                          <div className={styles.currentPath}>
                            <HardDrive size={18} />
                            <code>{browseData.currentPath}</code>
                          </div>

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

                          <div className={styles.directoryList}>
                            {browseData.directories.map((dir) => (
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
                            ))}
                          </div>
                        </>
                      ) : (
                        <Button onClick={() => loadDirectory(status.mountedLibrary.path)} variant="outline">
                          Abrir navegador
                        </Button>
                      )}
                    </div>
                  </details>
                </>
              ) : (
                /* Case 2: No library mounted or empty - Show instructions */
                <>
                  <p className={styles.stepDescription}>
                    No se ha detectado ninguna biblioteca de música. Necesitas configurar la ruta a tu música.
                  </p>

                  <div className={styles.instructionsBox}>
                    <h4>Cómo configurar tu biblioteca:</h4>
                    <ol>
                      <li>
                        Edita el archivo <code>.env</code> en la carpeta de Echo:
                        <pre>MUSIC_PATH=/ruta/a/tu/musica</pre>
                      </li>
                      <li>
                        Reinicia el contenedor:
                        <pre>docker compose restart echo-app</pre>
                      </li>
                      <li>
                        Vuelve a esta página y tu música aparecerá automáticamente.
                      </li>
                    </ol>

                    <div className={styles.examplesBox}>
                      <strong>Ejemplos de rutas:</strong>
                      <ul>
                        <li><code>MUSIC_PATH=/mnt/nas/music</code> — NAS montado</li>
                        <li><code>MUSIC_PATH=/home/usuario/Música</code> — Carpeta local</li>
                        <li><code>MUSIC_PATH=/media/disco/music</code> — Disco externo</li>
                      </ul>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <Button
                      onClick={() => checkStatus()}
                      variant="primary"
                      loading={isSubmitting}
                    >
                      Verificar de nuevo
                    </Button>
                  </div>
                </>
              )}

              {/* Validation result (when manually selecting) */}
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

              {/* Next button (only if library is configured) */}
              {libraryValidation?.valid && (
                <div className={styles.actions}>
                  <Button
                    onClick={() => setStep('complete')}
                    variant="primary"
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
