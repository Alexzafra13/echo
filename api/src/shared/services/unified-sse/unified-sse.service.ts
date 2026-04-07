import { Injectable } from '@nestjs/common';
import { Observable, merge, map } from 'rxjs';
import { NotificationEventsService } from '@features/notifications/application/notification-events.service';
import { MetadataEventsService } from '@features/external-metadata/infrastructure/services/metadata-events.service';
import { ImportProgressService } from '@features/federation/infrastructure/services/import-progress.service';

@Injectable()
export class UnifiedSSEService {
  constructor(
    private readonly notificationEvents: NotificationEventsService,
    private readonly metadataEvents: MetadataEventsService,
    private readonly importProgress: ImportProgressService
  ) {}

  getUnifiedStream(userId: string): Observable<MessageEvent> {
    const notifications$ = this.notificationEvents.getUserStream(userId).pipe(
      map(
        (evt) =>
          ({
            type: `notifications:${evt.event}`,
            data: evt.data,
          }) as MessageEvent
      )
    );

    const metadata$ = this.metadataEvents.getEventsStream().pipe(
      map(
        (evt) =>
          ({
            type: `metadata:${evt.event}`,
            data: evt.data,
          }) as MessageEvent
      )
    );

    const federation$ = this.importProgress.subscribeForUser(userId).pipe(
      map(
        (evt) =>
          ({
            type: 'federation:import:progress',
            data: evt,
          }) as MessageEvent
      )
    );

    return merge(notifications$, metadata$, federation$);
  }

  removeUser(userId: string): void {
    this.notificationEvents.removeUser(userId);
  }
}
