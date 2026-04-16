/**
 * Página del Asistente de Configuración
 *
 * Asistente de configuración inicial (estilo Jellyfin):
 * 1. Crear cuenta de administrador
 * 2. Seleccionar carpeta de biblioteca de música
 * 3. Completar configuración
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Lock,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronLeft,
  Check,
  Music,
  AlertCircle,
  Loader2,
  HardDrive,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@shared/components/ui';
import { UserAvatar } from '@shared/components/ui';
import { useSetupWizard } from '../../hooks/useSetupWizard';
import { ApiKeysStep } from './ApiKeysStep';
import styles from './SetupWizard.module.css';

function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

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
    adminUsername,
    libraryValidation,
    isBrowsing,
    checkStatus,
    loadDirectory,
    handleAdminSubmit: submitAdmin,
    handleSelectLibrary,
    handleCreateDirectory,
    handleSaveApiKeys,
    apiKeys,
    setApiKey,
    handleResetAdmin,
    handleCompleteSetup,
    handleGoToLogin,
    goToStep,
  } = useSetupWizard();

  // UI-only state for the "New folder" inline form and password strength
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSubmitting, setNewFolderSubmitting] = useState(false);

  // Smooth exit→swap→enter transition between steps
  const [displayStep, setDisplayStep] = useState(step);
  const [isExiting, setIsExiting] = useState(false);
  useEffect(() => {
    if (step === displayStep) return;
    setIsExiting(true);
    const t = setTimeout(() => {
      setDisplayStep(step);
      setIsExiting(false);
    }, 180);
    return () => clearTimeout(t);
  }, [step, displayStep]);

  // Formulario de admin
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
  });

  const passwordValue = watch('password') ?? '';
  const passwordScore = useMemo(() => scorePassword(passwordValue), [passwordValue]);

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
            {(() => {
              type StepId = 'admin' | 'library' | 'api-keys' | 'complete';
              const order: StepId[] = ['admin', 'library', 'api-keys', 'complete'];
              const stepIndex = order.indexOf(
                (step === 'done' ? 'complete' : step) as StepId
              );
              const renderStep = (id: StepId, label: string, number: string) => {
                const idx = order.indexOf(id);
                const isActive = stepIndex >= idx;
                const isCurrent = step === id;
                const isPast = stepIndex > idx;
                const canNavigate = isPast && step !== 'done';
                const showCheck = isPast || (id === 'complete' && step === 'done');
                return (
                  <button
                    type="button"
                    className={`${styles.progressStep} ${isActive ? styles.active : ''} ${canNavigate ? styles.clickable : ''}`}
                    onClick={() => canNavigate && goToStep(id)}
                    disabled={!canNavigate}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <div className={styles.stepCircle}>
                      {showCheck ? <Check size={16} /> : number}
                    </div>
                    <span>{label}</span>
                  </button>
                );
              };
              const line = (afterIdx: number) => (
                <div
                  className={styles.progressLine}
                  style={
                    {
                      '--progress': stepIndex > afterIdx ? 1 : 0,
                    } as React.CSSProperties
                  }
                />
              );
              return (
                <>
                  {renderStep('admin', t('setup.adminStep'), '1')}
                  {line(0)}
                  {renderStep('library', t('setup.libraryStep'), '2')}
                  {line(1)}
                  {renderStep('api-keys', t('setup.apiKeysStep'), '3')}
                  {line(2)}
                  {renderStep('complete', t('setup.completeStep'), '4')}
                </>
              );
            })()}
          </div>

          {/* Error message */}
          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div
            className={`${styles.stepSwitcher} ${isExiting ? styles.exiting : ''}`}
          >

          {/* Step 1: Create Admin */}
          {displayStep === 'admin' && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                <User size={24} />
                {t('setup.adminTitle')}
              </h2>
              <p className={styles.stepDescription}>{t('setup.adminDescription')}</p>

              {adminUsername ? (
                <>
                  <div className={styles.completedCard}>
                    <UserAvatar
                      userId={status?.adminUserId ?? undefined}
                      hasAvatar={status?.adminHasAvatar ?? false}
                      username={adminUsername}
                      size={52}
                      className={styles.completedAvatarImg}
                    />
                    <div className={styles.completedBody}>
                      <span className={styles.completedPrimary}>{adminUsername}</span>
                      <span className={styles.completedSecondary}>
                        {t('setup.adminAlreadyCreated')}
                      </span>
                    </div>
                    <Check size={18} className={styles.completedCheck} />
                  </div>
                  <div className={styles.actions}>
                    <Button
                      onClick={async () => {
                        if (window.confirm(t('setup.adminResetConfirm'))) {
                          await handleResetAdmin();
                        }
                      }}
                      variant="outline"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {t('setup.adminResetButton')}
                    </Button>
                    <Button
                      onClick={() => goToStep('library')}
                      variant="primary"
                      size="lg"
                      fullWidth
                      rightIcon={<ChevronRight size={20} />}
                    >
                      {t('setup.nextButton')}
                    </Button>
                  </div>
                </>
              ) : (
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

                  {passwordValue && (
                    <div
                      className={styles.strengthMeter}
                      data-score={passwordScore}
                      aria-live="polite"
                    >
                      <div className={styles.strengthBars}>
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={styles.strengthBar}
                            data-filled={i < passwordScore}
                          />
                        ))}
                      </div>
                      <span className={styles.strengthLabel}>
                        {t(
                          passwordScore <= 1
                            ? 'setup.passwordStrengthWeak'
                            : passwordScore === 2
                              ? 'setup.passwordStrengthFair'
                              : passwordScore === 3
                                ? 'setup.passwordStrengthGood'
                                : 'setup.passwordStrengthStrong'
                        )}
                      </span>
                    </div>
                  )}

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
              )}
            </div>
          )}

          {/* Step 2: Select Library (Jellyfin-style browser) */}
          {displayStep === 'library' && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                <FolderOpen size={24} />
                {t('setup.libraryTitle')}
              </h2>
              <p className={styles.stepDescription}>{t('setup.libraryDescription')}</p>

              {/* Quick select if music was auto-detected */}
              {status && status.mountedLibrary.fileCount > 0 && !libraryValidation && (
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
                        onClick={() => setNewFolderOpen((v) => !v)}
                        variant="secondary"
                        size="sm"
                        disabled={isBrowsing || isSubmitting}
                        leftIcon={<FolderPlus size={14} />}
                      >
                        {t('setup.newFolderButton')}
                      </Button>
                      <Button
                        onClick={() => handleSelectLibrary(browseData.currentPath)}
                        variant="primary"
                        size="sm"
                        disabled={isSubmitting}
                      >
                        {t('setup.useFolderButton')}
                      </Button>
                    </div>

                    {newFolderOpen && (
                      <form
                        className={styles.newFolderBar}
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const name = newFolderName.trim();
                          if (!name) return;
                          setNewFolderSubmitting(true);
                          const ok = await handleCreateDirectory(name);
                          setNewFolderSubmitting(false);
                          if (ok) {
                            setNewFolderName('');
                            setNewFolderOpen(false);
                          }
                        }}
                      >
                        <FolderPlus size={16} />
                        <input
                          autoFocus
                          className={styles.newFolderInput}
                          placeholder={t('setup.newFolderPlaceholder')}
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          disabled={newFolderSubmitting}
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={!newFolderName.trim() || newFolderSubmitting}
                          loading={newFolderSubmitting}
                        >
                          {t('setup.newFolderCreate')}
                        </Button>
                        <button
                          type="button"
                          className={styles.newFolderCancel}
                          onClick={() => {
                            setNewFolderOpen(false);
                            setNewFolderName('');
                          }}
                          aria-label={t('setup.newFolderCancel')}
                        >
                          <X size={16} />
                        </button>
                      </form>
                    )}

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
                        browseData.directories.map((dir) => {
                          const isSelected =
                            libraryValidation?.valid && selectedPath === dir.path;
                          return (
                            <div
                              key={dir.path}
                              className={`${styles.directoryRow} ${isSelected ? styles.selectedRow : ''}`}
                            >
                              <button
                                className={`${styles.directoryItem} ${!dir.readable ? styles.disabled : ''}`}
                                onClick={() => dir.readable && loadDirectory(dir.path)}
                                disabled={!dir.readable || isBrowsing}
                              >
                                <ChevronRight size={16} />
                                <FolderOpen size={18} />
                                <span>{dir.name}</span>
                                {dir.hasMusic && <Music size={14} className={styles.musicIcon} />}
                                {isSelected && (
                                  <Check size={14} className={styles.selectedCheck} />
                                )}
                              </button>
                              <Button
                                onClick={() => handleSelectLibrary(dir.path)}
                                variant={isSelected ? 'primary' : 'outline'}
                                size="sm"
                                disabled={!dir.readable || isSubmitting}
                              >
                                {isSelected
                                  ? t('setup.selectedButton')
                                  : t('setup.selectButton')}
                              </Button>
                            </div>
                          );
                        })
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
              {libraryValidation &&
                (libraryValidation.valid ? (
                  <div className={styles.completedCard}>
                    <div className={styles.completedFolderIcon} aria-hidden>
                      <FolderOpen size={22} strokeWidth={2} />
                    </div>
                    <div className={styles.completedBody}>
                      <span className={styles.completedPrimary}>
                        {(selectedPath || '').split('/').filter(Boolean).pop() || '/'}
                      </span>
                      {selectedPath && (
                        <span className={styles.completedSecondary}>{selectedPath}</span>
                      )}
                      <span className={styles.completedMeta}>
                        {typeof libraryValidation.fileCount === 'number' &&
                        libraryValidation.fileCount > 0
                          ? t('setup.musicFilesFound', { count: libraryValidation.fileCount })
                          : t('setup.noMusicFilesYet')}
                      </span>
                    </div>
                    <Check size={18} className={styles.completedCheck} />
                  </div>
                ) : (
                  <div className={`${styles.validationResult} ${styles.invalid}`}>
                    <AlertCircle size={18} />
                    <div className={styles.validationContent}>
                      <span>{libraryValidation.message}</span>
                    </div>
                  </div>
                ))}

              {/* Next button */}
              {libraryValidation?.valid && (
                <div className={styles.actions}>
                  <Button
                    onClick={() => goToStep('api-keys')}
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

          {/* Step 3: API Keys (optional) */}
          {displayStep === 'api-keys' && (
            <ApiKeysStep
              lastfm={apiKeys.lastfm}
              fanart={apiKeys.fanart}
              savedHints={status?.apiKeyHints}
              onChange={setApiKey}
              onSkip={() => goToStep('complete')}
              onSave={async (keys) => {
                const ok = await handleSaveApiKeys(keys);
                if (ok) goToStep('complete');
              }}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Step 4: Complete */}
          {displayStep === 'complete' && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>
                <Check size={24} />
                {t('setup.completeTitle')}
              </h2>
              <p className={styles.stepDescription}>{t('setup.completeDescription')}</p>

              <div className={styles.summaryCards}>
                <div className={styles.completedCard}>
                  {adminUsername && (
                    <UserAvatar
                      userId={status?.adminUserId ?? undefined}
                      hasAvatar={status?.adminHasAvatar ?? false}
                      username={adminUsername}
                      size={52}
                      className={styles.completedAvatarImg}
                    />
                  )}
                  <div className={styles.completedBody}>
                    <span className={styles.completedPrimary}>
                      {adminUsername ?? t('setup.adminCreated')}
                    </span>
                    <span className={styles.completedSecondary}>
                      {t('setup.adminAlreadyCreated')}
                    </span>
                  </div>
                  <Check size={18} className={styles.completedCheck} />
                </div>

                <div className={styles.completedCard}>
                  <div className={styles.completedFolderIcon} aria-hidden>
                    <FolderOpen size={22} strokeWidth={2} />
                  </div>
                  <div className={styles.completedBody}>
                    <span className={styles.completedPrimary}>
                      {(selectedPath || status?.musicLibraryPath || '')
                        .split('/')
                        .filter(Boolean)
                        .pop() || '/'}
                    </span>
                    <span className={styles.completedSecondary}>
                      {selectedPath || status?.musicLibraryPath}
                    </span>
                    {typeof libraryValidation?.fileCount === 'number' &&
                      libraryValidation.fileCount > 0 && (
                        <span className={styles.completedMeta}>
                          {t('setup.musicFilesFound', {
                            count: libraryValidation.fileCount,
                          })}
                        </span>
                      )}
                  </div>
                  <Check size={18} className={styles.completedCheck} />
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
          {displayStep === 'done' && (
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
    </div>
  );
}
