import { Test, TestingModule } from '@nestjs/testing';
import { CollaboratorsController } from './collaborators.controller';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import {
  InviteCollaboratorUseCase,
  AcceptCollaborationUseCase,
  RemoveCollaboratorUseCase,
  GetCollaboratorsUseCase,
  UpdateCollaboratorRoleUseCase,
} from '../../domain/use-cases';
import { createMockUseCase } from '@shared/testing/mock.types';
import { InviteCollaboratorDto, UpdateCollaboratorRoleDto } from '../dto';
import { RequestWithUser } from '@shared/types/request.types';

describe('CollaboratorsController', () => {
  let controller: CollaboratorsController;
  let inviteUseCase: { execute: jest.Mock };
  let acceptUseCase: { execute: jest.Mock };
  let removeUseCase: { execute: jest.Mock };
  let getUseCase: { execute: jest.Mock };
  let updateRoleUseCase: { execute: jest.Mock };

  const mockReq = (userId: string) => ({
    user: { id: userId, username: 'testuser' },
  });

  beforeEach(async () => {
    inviteUseCase = createMockUseCase();
    acceptUseCase = createMockUseCase();
    removeUseCase = createMockUseCase();
    getUseCase = createMockUseCase();
    updateRoleUseCase = createMockUseCase();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaboratorsController],
      providers: [
        { provide: InviteCollaboratorUseCase, useValue: inviteUseCase },
        { provide: AcceptCollaborationUseCase, useValue: acceptUseCase },
        { provide: RemoveCollaboratorUseCase, useValue: removeUseCase },
        { provide: GetCollaboratorsUseCase, useValue: getUseCase },
        { provide: UpdateCollaboratorRoleUseCase, useValue: updateRoleUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CollaboratorsController>(CollaboratorsController);
  });

  describe('inviteCollaborator', () => {
    it('should pass correct params to use case', async () => {
      inviteUseCase.execute.mockResolvedValue({ id: 'collab-1' });

      await controller.inviteCollaborator(
        'playlist-1',
        { userId: 'user-2', role: 'editor' } as InviteCollaboratorDto,
        mockReq('owner-1') as unknown as RequestWithUser
      );

      expect(inviteUseCase.execute).toHaveBeenCalledWith({
        playlistId: 'playlist-1',
        targetUserId: 'user-2',
        role: 'editor',
        inviterId: 'owner-1',
      });
    });
  });

  describe('getCollaborators', () => {
    it('should pass playlistId and requesterId to use case', async () => {
      getUseCase.execute.mockResolvedValue({ collaborators: [], total: 0 });

      await controller.getCollaborators(
        'playlist-1',
        mockReq('user-1') as unknown as RequestWithUser
      );

      expect(getUseCase.execute).toHaveBeenCalledWith({
        playlistId: 'playlist-1',
        requesterId: 'user-1',
      });
    });
  });

  describe('acceptCollaboration', () => {
    it('should pass collaborationId and userId to use case', async () => {
      acceptUseCase.execute.mockResolvedValue({ status: 'accepted' });

      await controller.acceptCollaboration(
        'collab-1',
        mockReq('invited-user') as unknown as RequestWithUser
      );

      expect(acceptUseCase.execute).toHaveBeenCalledWith({
        collaborationId: 'collab-1',
        userId: 'invited-user',
      });
    });
  });

  describe('updateCollaboratorRole', () => {
    it('should pass all params to use case', async () => {
      updateRoleUseCase.execute.mockResolvedValue({ role: 'viewer' });

      await controller.updateCollaboratorRole(
        'playlist-1',
        'user-2',
        { role: 'viewer' } as UpdateCollaboratorRoleDto,
        mockReq('owner-1') as unknown as RequestWithUser
      );

      expect(updateRoleUseCase.execute).toHaveBeenCalledWith({
        playlistId: 'playlist-1',
        targetUserId: 'user-2',
        role: 'viewer',
        requesterId: 'owner-1',
      });
    });
  });

  describe('removeCollaborator', () => {
    it('should pass playlistId, targetUserId, and requesterId to use case', async () => {
      removeUseCase.execute.mockResolvedValue({ removed: true });

      await controller.removeCollaborator(
        'playlist-1',
        'user-2',
        mockReq('owner-1') as unknown as RequestWithUser
      );

      expect(removeUseCase.execute).toHaveBeenCalledWith({
        playlistId: 'playlist-1',
        targetUserId: 'user-2',
        requesterId: 'owner-1',
      });
    });
  });
});
