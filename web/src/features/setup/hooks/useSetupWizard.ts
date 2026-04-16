import { useReducer, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import {
  getSetupStatus,
  createAdmin,
  configureLibrary,
  browseDirectories,
  createDirectory,
  completeSetup,
  resetAdmin,
  saveApiKeys,
  type SetupStatus,
  type BrowseResult,
} from '../api/setup.service';

type WizardStep = 'loading' | 'admin' | 'library' | 'api-keys' | 'complete' | 'done';

interface WizardState {
  step: WizardStep;
  status: SetupStatus | null;
  error: string | null;
  isSubmitting: boolean;
  browseData: BrowseResult | null;
  selectedPath: string;
  adminUsername: string;
  apiKeys: { lastfm: string; fanart: string };
  libraryValidation: {
    valid: boolean;
    message: string;
    fileCount?: number;
  } | null;
  isBrowsing: boolean;
}

type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_STATUS'; status: SetupStatus }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_BROWSE_DATA'; data: BrowseResult | null }
  | { type: 'SET_SELECTED_PATH'; path: string }
  | { type: 'SET_ADMIN_USERNAME'; username: string }
  | { type: 'SET_API_KEY'; provider: 'lastfm' | 'fanart'; value: string }
  | { type: 'SET_LIBRARY_VALIDATION'; validation: WizardState['libraryValidation'] }
  | { type: 'SET_BROWSING'; value: boolean };

const initialState: WizardState = {
  step: 'loading',
  status: null,
  error: null,
  isSubmitting: false,
  browseData: null,
  selectedPath: '/',
  adminUsername: '',
  apiKeys: { lastfm: '', fanart: '' },
  libraryValidation: null,
  isBrowsing: false,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };
    case 'SET_BROWSE_DATA':
      return {
        ...state,
        browseData: action.data,
        selectedPath: action.data?.currentPath ?? state.selectedPath,
      };
    case 'SET_SELECTED_PATH':
      return { ...state, selectedPath: action.path };
    case 'SET_ADMIN_USERNAME':
      return { ...state, adminUsername: action.username };
    case 'SET_API_KEY':
      return {
        ...state,
        apiKeys: { ...state.apiKeys, [action.provider]: action.value },
      };
    case 'SET_LIBRARY_VALIDATION':
      return { ...state, libraryValidation: action.validation };
    case 'SET_BROWSING':
      return { ...state, isBrowsing: action.value };
    default:
      return state;
  }
}

export function useSetupWizard() {
  const [, setLocation] = useLocation();
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => dispatch({ type: 'SET_ERROR', error: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  const loadDirectory = useCallback(async (path: string) => {
    dispatch({ type: 'SET_BROWSING', value: true });
    try {
      const result = await browseDirectories(path);
      dispatch({ type: 'SET_BROWSE_DATA', data: result });
    } catch (error: unknown) {
      dispatch({
        type: 'SET_ERROR',
        error: getApiErrorMessage(error, 'Error al explorar directorios'),
      });
    } finally {
      dispatch({ type: 'SET_BROWSING', value: false });
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const setupStatus = await getSetupStatus();
      dispatch({ type: 'SET_STATUS', status: setupStatus });
      if (setupStatus.adminUsername) {
        dispatch({ type: 'SET_ADMIN_USERNAME', username: setupStatus.adminUsername });
      }

      if (!setupStatus.needsSetup) {
        setLocation('/login');
        return;
      }

      if (!setupStatus.hasAdmin) {
        dispatch({ type: 'SET_STEP', step: 'admin' });
      } else if (!setupStatus.hasMusicLibrary) {
        dispatch({ type: 'SET_STEP', step: 'library' });
        loadDirectory('/');
      } else {
        dispatch({ type: 'SET_STEP', step: 'complete' });
      }
    } catch {
      dispatch({ type: 'SET_ERROR', error: 'Error al conectar con el servidor' });
      dispatch({ type: 'SET_STEP', step: 'admin' });
    }
  }, [setLocation, loadDirectory]);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleAdminSubmit = useCallback(
    async (data: { username: string; password: string }) => {
      dispatch({ type: 'SET_SUBMITTING', value: true });
      dispatch({ type: 'SET_ERROR', error: null });
      try {
        await createAdmin(data);
        dispatch({ type: 'SET_ADMIN_USERNAME', username: data.username });
        dispatch({ type: 'SET_STEP', step: 'library' });
        loadDirectory('/');
      } catch (error: unknown) {
        dispatch({
          type: 'SET_ERROR',
          error: getApiErrorMessage(error, 'Error al crear la cuenta de administrador'),
        });
      } finally {
        dispatch({ type: 'SET_SUBMITTING', value: false });
      }
    },
    [loadDirectory]
  );

  const handleSelectLibrary = useCallback(async (path: string) => {
    dispatch({ type: 'SET_SUBMITTING', value: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      const result = await configureLibrary(path);
      dispatch({ type: 'SET_LIBRARY_VALIDATION', validation: result });
      if (result.valid) {
        dispatch({ type: 'SET_SELECTED_PATH', path });
      }
    } catch (error: unknown) {
      dispatch({
        type: 'SET_ERROR',
        error: getApiErrorMessage(error, 'Error al validar la biblioteca'),
      });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  }, []);

  const handleCompleteSetup = useCallback(async () => {
    dispatch({ type: 'SET_SUBMITTING', value: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      await completeSetup();
      dispatch({ type: 'SET_STEP', step: 'done' });
    } catch (error: unknown) {
      dispatch({
        type: 'SET_ERROR',
        error: getApiErrorMessage(error, 'Error al completar la configuración'),
      });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  }, []);

  const handleCreateDirectory = useCallback(
    async (name: string): Promise<boolean> => {
      if (!state.browseData) return false;
      dispatch({ type: 'SET_BROWSING', value: true });
      dispatch({ type: 'SET_ERROR', error: null });
      try {
        await createDirectory(state.browseData.currentPath, name);
        const refreshed = await browseDirectories(state.browseData.currentPath);
        dispatch({ type: 'SET_BROWSE_DATA', data: refreshed });
        return true;
      } catch (error: unknown) {
        dispatch({
          type: 'SET_ERROR',
          error: getApiErrorMessage(error, 'Error al crear la carpeta'),
        });
        return false;
      } finally {
        dispatch({ type: 'SET_BROWSING', value: false });
      }
    },
    [state.browseData]
  );

  const setApiKey = useCallback((provider: 'lastfm' | 'fanart', value: string) => {
    dispatch({ type: 'SET_API_KEY', provider, value });
  }, []);

  const handleSaveApiKeys = useCallback(
    async (keys: { lastfm?: string; fanart?: string }): Promise<boolean> => {
      dispatch({ type: 'SET_SUBMITTING', value: true });
      dispatch({ type: 'SET_ERROR', error: null });
      try {
        await saveApiKeys(keys);
        // Limpiar los inputs para que al volver al paso se vea el hint
        // "••••af4" en vez del valor que se acaba de escribir.
        if (typeof keys.lastfm === 'string') {
          dispatch({ type: 'SET_API_KEY', provider: 'lastfm', value: '' });
        }
        if (typeof keys.fanart === 'string') {
          dispatch({ type: 'SET_API_KEY', provider: 'fanart', value: '' });
        }
        // Refresca hints (últimos 4 chars) desde la DB
        try {
          const refreshed = await getSetupStatus();
          dispatch({ type: 'SET_STATUS', status: refreshed });
        } catch {
          // Non-fatal: si falla, el hint anterior sigue siendo válido
        }
        return true;
      } catch (error: unknown) {
        dispatch({
          type: 'SET_ERROR',
          error: getApiErrorMessage(error, 'Error al guardar las claves'),
        });
        return false;
      } finally {
        dispatch({ type: 'SET_SUBMITTING', value: false });
      }
    },
    []
  );

  const handleResetAdmin = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'SET_SUBMITTING', value: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      await resetAdmin();
      dispatch({ type: 'SET_ADMIN_USERNAME', username: '' });
      const refreshed = await getSetupStatus();
      dispatch({ type: 'SET_STATUS', status: refreshed });
      return true;
    } catch (error: unknown) {
      dispatch({
        type: 'SET_ERROR',
        error: getApiErrorMessage(error, 'Error al restablecer el administrador'),
      });
      return false;
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  }, []);

  const handleGoToLogin = useCallback(() => {
    setLocation('/login');
  }, [setLocation]);

  const goToStep = useCallback(
    (targetStep: WizardStep) => {
      dispatch({ type: 'SET_STEP', step: targetStep });

      // Al volver al paso de biblioteca con una carpeta ya seleccionada,
      // carga el directorio padre para que la fila elegida quede visible.
      if (targetStep === 'library' && state.selectedPath) {
        const sep = state.selectedPath.lastIndexOf('/');
        const parent = sep > 0 ? state.selectedPath.substring(0, sep) : '/';
        const targetDir =
          state.browseData?.currentPath === state.selectedPath ? state.selectedPath : parent;
        if (state.browseData?.currentPath !== targetDir) {
          loadDirectory(targetDir);
        }
      }
    },
    [state.selectedPath, state.browseData, loadDirectory]
  );

  return {
    ...state,
    checkStatus,
    loadDirectory,
    handleAdminSubmit,
    handleSelectLibrary,
    handleCreateDirectory,
    handleSaveApiKeys,
    setApiKey,
    handleResetAdmin,
    handleCompleteSetup,
    handleGoToLogin,
    goToStep,
  };
}
