import { useCallback, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, Link2, Plus, Shield, Activity } from 'lucide-react';
import { Button, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import { ServerIdentityCard } from './ServerIdentityCard';
import { ConnectServerModal } from './ConnectServerModal';
import { CreateInvitationModal } from './CreateInvitationModal';
import { ServerCard } from './ServerCard';
import { InvitationCard } from './InvitationCard';
import { AccessCard } from './AccessCard';
import { MutualRequestsBanner } from './MutualRequestsBanner';
import { useFederationHandlers } from '../../hooks/useFederationHandlers';
import styles from './FederationPanel.module.css';

/**
 * FederationPanel Component
 * Panel para gestionar conexiones con otros servidores Echo
 */
export function FederationPanel() {
  const { t } = useTranslation();
  const {
    activeTab,
    setActiveTab,
    notification,
    showSuccess,
    showError,
    dismiss,
    copiedToken,
    handleCopyToken,
    syncingServerId,
    servers,
    serversLoading,
    invitations,
    invitationsLoading,
    accessTokens,
    accessLoading,
    pendingMutualRequests,
    connectModal,
    createInvitationModal,
    disconnectModal,
    deleteInvitationModal,
    revokeAccessModal,
    deleteAccessModal,
    checkHealthMutation,
    disconnectMutation,
    deleteInvitationMutation,
    revokeAccessMutation,
    deleteAccessMutation,
    approveMutualMutation,
    rejectMutualMutation,
    updatePermissionsMutation,
    reactivateAccessMutation,
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
  } = useFederationHandlers();

  type FedTab = 'servers' | 'invitations' | 'access';
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabNavRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<FedTab, HTMLButtonElement>>(new Map());

  const updateIndicator = useCallback(() => {
    const activeButton = tabRefs.current.get(activeTab as FedTab);
    const navContainer = tabNavRef.current;
    if (activeButton && navContainer) {
      const navRect = navContainer.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - navRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeTab]);

  useEffect(() => updateIndicator(), [updateIndicator]);
  useEffect(() => {
    const timer = setTimeout(updateIndicator, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDisconnectServer = useCallback(
    (s: Parameters<typeof disconnectModal.openWith>[0]) => disconnectModal.openWith(s),
    [disconnectModal]
  );
  const handleDeleteInvitationOpen = useCallback(
    (inv: Parameters<typeof deleteInvitationModal.openWith>[0]) =>
      deleteInvitationModal.openWith(inv),
    [deleteInvitationModal]
  );
  const handleRevokeAccessOpen = useCallback(
    (t: Parameters<typeof revokeAccessModal.openWith>[0]) => revokeAccessModal.openWith(t),
    [revokeAccessModal]
  );
  const handleDeleteAccessOpen = useCallback(
    (t: Parameters<typeof deleteAccessModal.openWith>[0]) => deleteAccessModal.openWith(t),
    [deleteAccessModal]
  );

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>{t('admin.federation.title')}</h2>
          <p className={styles.description}>{t('admin.federation.description')}</p>
        </div>
      </div>

      <ServerIdentityCard onSuccess={showSuccess} onError={showError} />

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={dismiss}
          autoHideMs={3000}
        />
      )}

      {/* Pending Mutual Requests Banner */}
      <MutualRequestsBanner
        requests={pendingMutualRequests}
        onApprove={handleApproveMutual}
        onReject={handleRejectMutual}
        isApproving={approveMutualMutation.isPending}
        isRejecting={rejectMutualMutation.isPending}
      />

      {/* Tabs */}
      <div className={styles.tabs} ref={tabNavRef}>
        <div
          className={styles.tabIndicator}
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
          }}
        />
        <button
          ref={(el) => {
            if (el) tabRefs.current.set('servers', el);
          }}
          className={`${styles.tab} ${activeTab === 'servers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('servers')}
        >
          <Server size={18} />
          <span className={styles.tabLabelFull}>{t('admin.federation.connectedServers')}</span>
          <span className={styles.tabLabelShort}>
            {t('admin.federation.connectedServersShort')}
          </span>
          {servers && servers.length > 0 && (
            <span className={styles.tabBadge}>{servers.length}</span>
          )}
        </button>
        <button
          ref={(el) => {
            if (el) tabRefs.current.set('invitations', el);
          }}
          className={`${styles.tab} ${activeTab === 'invitations' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('invitations')}
        >
          <Link2 size={18} />
          <span className={styles.tabLabelFull}>{t('admin.federation.myInvitations')}</span>
          <span className={styles.tabLabelShort}>{t('admin.federation.myInvitationsShort')}</span>
          {invitations && invitations.length > 0 && (
            <span className={styles.tabBadge}>{invitations.length}</span>
          )}
        </button>
        <button
          ref={(el) => {
            if (el) tabRefs.current.set('access', el);
          }}
          className={`${styles.tab} ${activeTab === 'access' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('access')}
        >
          <Shield size={18} />
          <span className={styles.tabLabelFull}>{t('admin.federation.whoHasAccess')}</span>
          <span className={styles.tabLabelShort}>{t('admin.federation.whoHasAccessShort')}</span>
          {accessTokens && accessTokens.length > 0 && (
            <span className={styles.tabBadge}>{accessTokens.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Servidores Conectados */}
        {activeTab === 'servers' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h3>{t('admin.federation.serversYouConnected')}</h3>
                <p>{t('admin.federation.serversYouConnectedDesc')}</p>
              </div>
              <div className={styles.headerActions}>
                {servers && servers.length > 0 && (
                  <Button
                    variant="secondary"
                    leftIcon={<Activity size={18} />}
                    onClick={handleCheckHealth}
                    disabled={checkHealthMutation.isPending}
                  >
                    {checkHealthMutation.isPending
                      ? t('admin.federation.checking')
                      : t('admin.federation.checkHealth')}
                  </Button>
                )}
                <Button variant="primary" leftIcon={<Plus size={18} />} onClick={connectModal.open}>
                  {t('admin.federation.connectServer')}
                </Button>
              </div>
            </div>

            {serversLoading ? (
              <div className={styles.loadingState}>{t('common.loading')}</div>
            ) : servers && servers.length > 0 ? (
              <div className={styles.serverGrid}>
                {servers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    onSync={handleSync}
                    onDisconnect={handleDisconnectServer}
                    onColorChange={handleColorChange}
                    isSyncing={syncingServerId === server.id}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Server size={48} className={styles.emptyIcon} />
                <h3>{t('admin.federation.noServers')}</h3>
                <p>{t('admin.federation.noServersHint')}</p>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={18} />}
                  onClick={connectModal.open}
                >
                  {t('admin.federation.connectServer')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Invitaciones */}
        {activeTab === 'invitations' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h3>{t('admin.federation.invitationTokens')}</h3>
                <p>{t('admin.federation.invitationTokensDesc')}</p>
              </div>
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={createInvitationModal.open}
              >
                {t('admin.federation.createInvitation')}
              </Button>
            </div>

            {invitationsLoading ? (
              <div className={styles.loadingState}>{t('common.loading')}</div>
            ) : invitations && invitations.length > 0 ? (
              <div className={styles.invitationList}>
                {invitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    copiedToken={copiedToken}
                    onCopyToken={handleCopyToken}
                    onDelete={handleDeleteInvitationOpen}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Link2 size={48} className={styles.emptyIcon} />
                <h3>{t('admin.federation.noInvitations')}</h3>
                <p>{t('admin.federation.noInvitationsHint')}</p>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={18} />}
                  onClick={createInvitationModal.open}
                >
                  {t('admin.federation.createInvitation')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Acceso */}
        {activeTab === 'access' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h3>{t('admin.federation.serversWithAccess')}</h3>
                <p>{t('admin.federation.serversWithAccessDesc')}</p>
              </div>
            </div>

            {accessLoading ? (
              <div className={styles.loadingState}>{t('common.loading')}</div>
            ) : accessTokens && accessTokens.length > 0 ? (
              <div className={styles.accessList}>
                {accessTokens.map((token) => (
                  <AccessCard
                    key={token.id}
                    token={token}
                    onTogglePermission={handleTogglePermission}
                    onRevoke={handleRevokeAccessOpen}
                    onReactivate={handleReactivateAccess}
                    onDelete={handleDeleteAccessOpen}
                    isUpdatingPermissions={updatePermissionsMutation.isPending}
                    isReactivating={reactivateAccessMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Shield size={48} className={styles.emptyIcon} />
                <h3>{t('admin.federation.noAccess')}</h3>
                <p>{t('admin.federation.noAccessHint')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {connectModal.isOpen && (
        <ConnectServerModal
          onClose={connectModal.close}
          onSuccess={() => {
            connectModal.close();
            showSuccess(t('admin.federation.connected'));
          }}
        />
      )}

      {createInvitationModal.isOpen && (
        <CreateInvitationModal
          onClose={createInvitationModal.close}
          onSuccess={() => {
            createInvitationModal.close();
            showSuccess(t('admin.federation.invitationCreated'));
          }}
        />
      )}

      {disconnectModal.isOpen && disconnectModal.data && (
        <ConfirmDialog
          title={t('admin.federation.disconnectServerTitle')}
          message={t('admin.federation.disconnectServerMessage', {
            name: disconnectModal.data.name,
          })}
          confirmText={t('admin.federation.disconnect')}
          onConfirm={handleDisconnect}
          onCancel={disconnectModal.close}
          isLoading={disconnectMutation.isPending}
        />
      )}

      {deleteInvitationModal.isOpen && deleteInvitationModal.data && (
        <ConfirmDialog
          title={t('admin.federation.deleteInvitationTitle')}
          message={t('admin.federation.deleteInvitationMessage')}
          confirmText={t('common.delete')}
          onConfirm={handleDeleteInvitation}
          onCancel={deleteInvitationModal.close}
          isLoading={deleteInvitationMutation.isPending}
        />
      )}

      {revokeAccessModal.isOpen && revokeAccessModal.data && (
        <ConfirmDialog
          title={t('admin.federation.revokeAccessTitle')}
          message={t('admin.federation.revokeAccessMessage', {
            name: revokeAccessModal.data.serverName,
          })}
          confirmText={t('admin.federation.revoke')}
          onConfirm={handleRevokeAccess}
          onCancel={revokeAccessModal.close}
          isLoading={revokeAccessMutation.isPending}
        />
      )}

      {deleteAccessModal.isOpen && deleteAccessModal.data && (
        <ConfirmDialog
          title={t('admin.federation.deleteAccessTitle')}
          message={t('admin.federation.deleteAccessMessage', {
            name: deleteAccessModal.data.serverName,
          })}
          confirmText={t('common.delete')}
          onConfirm={handleDeleteAccess}
          onCancel={deleteAccessModal.close}
          isLoading={deleteAccessMutation.isPending}
        />
      )}
    </div>
  );
}
