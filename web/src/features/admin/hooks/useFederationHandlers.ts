import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal, useNotification } from '@shared/hooks';
import {
  useConnectedServers,
  useInvitationTokens,
  useAccessTokens,
  useDeleteInvitation,
  useDisconnectFromServer,
  useSyncServer,
  useUpdateServer,
  useRevokeAccessToken,
  useDeleteAccessToken,
  useReactivateAccessToken,
  useCheckAllServersHealth,
  usePendingMutualRequests,
  useApproveMutualRequest,
  useRejectMutualRequest,
  useUpdatePermissions,
} from './useFederation';
import type { ConnectedServer, InvitationToken, AccessToken } from '../api/federation.service';

/**
 * Hook que encapsula toda la lógica de datos y mutaciones de FederationPanel
 */
export function useFederationHandlers() {
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = useState<'servers' | 'invitations' | 'access'>('servers');

  // Copy token feedback
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  // Sync state
  const [syncingServerId, setSyncingServerId] = useState<string | null>(null);

  // Modals
  const connectModal = useModal();
  const createInvitationModal = useModal();
  const disconnectModal = useModal<ConnectedServer>();
  const deleteInvitationModal = useModal<InvitationToken>();
  const revokeAccessModal = useModal<AccessToken>();
  const deleteAccessModal = useModal<AccessToken>();

  // Notifications
  const { notification, showSuccess, showError, dismiss } = useNotification();

  // Queries
  const { data: servers, isLoading: serversLoading } = useConnectedServers();
  const { data: invitations, isLoading: invitationsLoading } = useInvitationTokens();
  const { data: accessTokens, isLoading: accessLoading } = useAccessTokens();
  const { data: pendingMutualRequests = [] } = usePendingMutualRequests();

  // Mutations
  const disconnectMutation = useDisconnectFromServer();
  const syncMutation = useSyncServer();
  const deleteInvitationMutation = useDeleteInvitation();
  const revokeAccessMutation = useRevokeAccessToken();
  const checkHealthMutation = useCheckAllServersHealth();
  const approveMutualMutation = useApproveMutualRequest();
  const rejectMutualMutation = useRejectMutualRequest();
  const updatePermissionsMutation = useUpdatePermissions();
  const deleteAccessMutation = useDeleteAccessToken();
  const reactivateAccessMutation = useReactivateAccessToken();
  const updateServerMutation = useUpdateServer();

  // Handlers
  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      showError(t('admin.federation.errorCopyToken'));
    }
  };

  const handleSync = async (server: ConnectedServer) => {
    setSyncingServerId(server.id);
    try {
      await syncMutation.mutateAsync(server.id);
      showSuccess(t('admin.federation.syncedWith', { name: server.name }));
    } catch {
      showError(t('admin.federation.errorSync'));
    } finally {
      setSyncingServerId(null);
    }
  };

  const handleCheckHealth = async () => {
    try {
      await checkHealthMutation.mutateAsync();
      showSuccess(t('admin.federation.healthUpdated'));
    } catch {
      showError(t('admin.federation.errorCheckHealth'));
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectModal.data) return;
    try {
      await disconnectMutation.mutateAsync(disconnectModal.data.id);
      disconnectModal.close();
      showSuccess(t('admin.federation.disconnected'));
    } catch {
      showError(t('admin.federation.errorDisconnect'));
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteInvitationModal.data) return;
    try {
      await deleteInvitationMutation.mutateAsync(deleteInvitationModal.data.id);
      deleteInvitationModal.close();
      showSuccess(t('admin.federation.invitationDeleted'));
    } catch {
      showError(t('admin.federation.errorDeleteInvitation'));
    }
  };

  const handleRevokeAccess = async () => {
    if (!revokeAccessModal.data) return;
    try {
      await revokeAccessMutation.mutateAsync(revokeAccessModal.data.id);
      revokeAccessModal.close();
      showSuccess(t('admin.federation.accessRevoked'));
    } catch {
      showError(t('admin.federation.errorRevokeAccess'));
    }
  };

  const handleDeleteAccess = async () => {
    if (!deleteAccessModal.data) return;
    try {
      await deleteAccessMutation.mutateAsync(deleteAccessModal.data.id);
      deleteAccessModal.close();
      showSuccess(t('admin.federation.accessDeleted'));
    } catch {
      showError(t('admin.federation.errorDeleteAccess'));
    }
  };

  const handleReactivateAccess = async (token: AccessToken) => {
    try {
      await reactivateAccessMutation.mutateAsync(token.id);
      showSuccess(t('admin.federation.accessReactivated', { name: token.serverName }));
    } catch {
      showError(t('admin.federation.errorReactivateAccess'));
    }
  };

  const handleApproveMutual = async (request: AccessToken) => {
    try {
      await approveMutualMutation.mutateAsync(request.id);
      showSuccess(t('admin.federation.connectedWith', { name: request.serverName }));
    } catch {
      showError(t('admin.federation.errorApproveRequest'));
    }
  };

  const handleRejectMutual = async (request: AccessToken) => {
    try {
      await rejectMutualMutation.mutateAsync(request.id);
      showSuccess(t('admin.federation.requestRejected'));
    } catch {
      showError(t('admin.federation.errorRejectRequest'));
    }
  };

  const handleColorChange = async (serverId: string, color: string) => {
    try {
      await updateServerMutation.mutateAsync({ id: serverId, data: { color } });
    } catch {
      showError(t('admin.federation.errorChangeColor'));
    }
  };

  const handleTogglePermission = async (
    token: AccessToken,
    permission: 'canBrowse' | 'canStream' | 'canDownload'
  ) => {
    try {
      await updatePermissionsMutation.mutateAsync({
        id: token.id,
        permissions: { [permission]: !token.permissions[permission] },
      });
      showSuccess(t('admin.federation.permissionsUpdated'));
    } catch {
      showError(t('admin.federation.errorUpdatePermissions'));
    }
  };

  return {
    // Tab
    activeTab,
    setActiveTab,

    // Notifications
    notification,
    showSuccess,
    showError,
    dismiss,

    // Copy
    copiedToken,
    handleCopyToken,

    // Sync
    syncingServerId,

    // Queries
    servers,
    serversLoading,
    invitations,
    invitationsLoading,
    accessTokens,
    accessLoading,
    pendingMutualRequests,

    // Modals
    connectModal,
    createInvitationModal,
    disconnectModal,
    deleteInvitationModal,
    revokeAccessModal,
    deleteAccessModal,

    // Mutation states
    checkHealthMutation,
    disconnectMutation,
    deleteInvitationMutation,
    revokeAccessMutation,
    deleteAccessMutation,
    approveMutualMutation,
    rejectMutualMutation,
    updatePermissionsMutation,
    reactivateAccessMutation,

    // Handlers
    handleSync,
    handleCheckHealth,
    handleDisconnect,
    handleDeleteInvitation,
    handleRevokeAccess,
    handleDeleteAccess,
    handleReactivateAccess,
    handleApproveMutual,
    handleRejectMutual,
    handleColorChange,
    handleTogglePermission,
  };
}
