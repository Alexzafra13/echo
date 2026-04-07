/**
 * Página del Asistente de Configuración
 *
 * Asistente de configuración inicial (estilo Jellyfin):
 * 1. Crear cuenta de administrador
 * 2. Seleccionar carpeta de biblioteca de música
 * 3. Completar configuración
 */

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
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@shared/components/ui';
import { useSetupWizard } from '../../hooks/useSetupWizard';
import styles from './SetupWizard.module.css';

export default function SetupWizard() {
  const { t } = useTranslation();

  // Schemas de validación (inside component so they use t())
  const adminSchema = z
    .object({
      username: z.string().min(3, t('setup.usernameMinLength')),
      password: z.string().min(8, t('setup.passwordMinLength')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('setup.passwordMismatch'),
      path: ['confirmPassword'],
    });

  type AdminFormData = z.infer<typeof adminSchema>;

  const {
    step,
    status,
    error,
    isSubmitting,
    browseData,
    selectedPath,
    libraryValidation,
    isBrowsing,
    checkStatus,
    loadDirectory,
    handleAdminSubmit: submitAdmin,
    handleSelectLibrary,
    handleCompleteSetup,
    handleGoToLogin,
    goToStep,
  } = useSetupWizard();

  // Formulario de admin
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
  });

  const handleAdminSubmit = (data: AdminFormData) => {
    submitAdmin({ username: data.username, password: data.password });
  };

  // Renderizar estado de carga
  if (step === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.content}>
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={48} />
            <p>{t('setup.checkingStatus')}</p>
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
          <img src="/images/empy_cover/empy_cover_default.png" alt="Echo" className={styles.logo} />
        </div>

        {/* Wizard Card */}
        <div className={styles.wizardCard}>
          {/* Progress indicator */}
          <div className={styles.progressBar}>
            <div className={`${styles.progressStep} ${styles.active}`}>
              <div className={styles.stepCircle}>
                {step === 'admin' ? '1' : <Check size={16} />}
              </div>
              <span>{t('setup.adminStep')}</span>
            </div>
            <div className={styles.progressLine} />
            <div
              className={`${styles.progressStep} ${
                step === 'library' || step === 'complete' || step === 'done' ? styles.active : ''
              }`}
            >
              <div className={styles.stepCircle}>
                {step === 'library' ? (
                  '2'
                ) : step === 'complete' || step === 'done' ? (
                  <Check size={16} />
                ) : (
                  '2'
                )}
              </div>
              <span>{t('setup.libraryStep')}</span>
            </div>
            <div className={styles.progressLine} />
            <div
              className={`${styles.progressStep} ${step === 'complete' || step === 'done' ? styles.active : ''}`}
            >
              <div className={styles.stepCircle}>{step === 'done' ? <Check size={16} /> : '3'}</div>
              <span>{t('setup.completeStep')}</span>
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
                {t('setup.adminTitle')}
              </h2>
              <p className={styles.stepDescription}>{t('setup.adminDescription')}</p>

              <form onSubmit={handleSubmit(handleAdminSubmit)} className={styles.form}>
                <fieldset disabled={isSubmitting} className="fieldset-reset">
                  <Input
                    {...register('username')}
                    type="text"
                    label={t('setup.usernameLabel')}
                    placeholder={t('setup.usernamePlaceholder')}
                    error={errors.username?.message}
                    leftIcon={<User size={20} />}
                    autoComplete="username"
                  />

                  <Input
                    {...register('password')}
                    type="password"
                    label={t('setup.passwordLabel')}
                    placeholder={t('setup.passwordPlaceholder')}
                    error={errors.password?.message}
                    leftIcon={<Lock size={20} />}
                    autoComplete="new-password"
                  />

                  <Input
                    {...register('confirmPassword')}
                    type="password"
                    label={t('setup.confirmPasswordLabel')}
                    placeholder={t('setup.confirmPasswordPlaceholder')}
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
                    {t('setup.nextButton')}
                  </Button>
                </fieldset>
              </form>
            </div>
          )}

          {/* Step 2: Select Library (Jellyfin-style browser) */}
          {step === 'library' && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                <FolderOpen size={24} />
                {t('setup.libraryTitle')}
              </h2>
              <p className={styles.stepDescription}>{t('setup.libraryDescription')}</p>

              {/* Quick select if music was auto-detected */}
              {status?.mountedLibrary.fileCount &&
                status.mountedLibrary.fileCount > 0 &&
                !libraryValidation && (
                  <div className={`${styles.validationResult} ${styles.valid}`}>
                    <Music size={18} />
                    <div className={styles.quickSelectContent}>
                      <span>
                        <strong>{status.mountedLibrary.fileCount.toLocaleString()}</strong>{' '}
                        {t('setup.filesFoundIn')} <code>{status.mountedLibrary.path}</code>
                      </span>
                      <Button
                        onClick={() => handleSelectLibrary(status.mountedLibrary.path)}
                        variant="outline"
                        size="sm"
                        loading={isSubmitting}
                      >
                        {t('setup.useThisButton')}
                      </Button>
                    </div>
                  </div>
                )}

              {/* Directory browser - Always visible */}
              <div className={styles.browser}>
                {isBrowsing ? (
                  <div className={styles.browserLoading}>
                    <Loader2 className={styles.spinner} size={24} />
                    <span>{t('setup.loading')}</span>
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
                        {t('setup.useFolderButton')}
                      </Button>
                    </div>

                    {/* Go up button */}
                    {browseData.canGoUp && (
                      <button
                        className={styles.directoryItem}
                        onClick={() =>
                          browseData.parentPath && loadDirectory(browseData.parentPath)
                        }
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
                        <div className={styles.emptyDirectory}>{t('setup.noSubdirectories')}</div>
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
                              {t('setup.selectButton')}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : !status?.mountedLibrary.isMounted ? (
                  /* No folders mounted - show help */
                  <div className={styles.instructionsBox}>
                    <h4>{t('setup.noAccessibleFolders')}</h4>
                    <p>{t('setup.defaultPaths')}</p>
                    <p>{t('setup.volumeInstructions')}</p>
                    <pre>volumes:{'\n'} - /tu/ruta/musica:/mnt/music:ro</pre>
                    <Button
                      onClick={() => checkStatus()}
                      variant="outline"
                      style={{ marginTop: '12px' }}
                    >
                      {t('setup.checkAgainButton')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => loadDirectory(status.mountedLibrary.path)}
                    variant="outline"
                    fullWidth
                  >
                    {t('setup.browseFoldersButton')}
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
                    onClick={() => goToStep('complete')}
                    variant="primary"
                    size="lg"
                    fullWidth
                    rightIcon={<ChevronRight size={20} />}
                  >
                    {t('setup.nextButton')}
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
                {t('setup.completeTitle')}
              </h2>
              <p className={styles.stepDescription}>{t('setup.completeDescription')}</p>

              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <User size={20} />
                  <span>{t('setup.adminCreated')}</span>
                  <Check size={18} className={styles.checkIcon} />
                </div>
                <div className={styles.summaryItem}>
                  <FolderOpen size={20} />
                  <span>
                    {t('setup.libraryLabel')}
                    {selectedPath || status?.musicLibraryPath}
                  </span>
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
                {t('setup.completeButton')}
              </Button>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className={styles.stepContent}>
              <div className={styles.successIcon}>
                <Check size={48} />
              </div>
              <h2 className={styles.stepTitle}>{t('setup.doneTitle')}</h2>
              <p className={styles.stepDescription}>{t('setup.doneDescription')}</p>

              <Button
                onClick={handleGoToLogin}
                variant="primary"
                size="lg"
                fullWidth
                rightIcon={<ChevronRight size={20} />}
              >
                {t('setup.goToLoginButton')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
